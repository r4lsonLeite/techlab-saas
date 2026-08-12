import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


import main
from core.database import get_db
from core.deps import obter_usuario_logado
from models import models



SQLALCHEMY_DATABASE_URL = "sqlite:///./banco_de_testes.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


models.Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_usuario_logado():
    return models.Usuario(id=1, loja_id=1, nome="Testador", cargo="admin", ativo=True)


main.app.dependency_overrides[get_db] = override_get_db
main.app.dependency_overrides[obter_usuario_logado] = override_usuario_logado

client = TestClient(main.app)



def test_impedir_venda_de_peca_sem_stock():
    
    db = TestingSessionLocal()
    produto_fisico = models.Produto(nome="Ecrã iPhone 12", preco_venda=1500.0, estoque_atual=0, is_servico=False, loja_id=1, ativo=True)
    db.add(produto_fisico)
    db.commit()
    db.refresh(produto_fisico)
    produto_id = produto_fisico.id
    db.close()

    payload = {
        "valor_total": 1500.0,
        "forma_pagamento": "PIX",
        "itens": [{"produto_id": produto_id, "quantidade": 1, "preco_unitario": 1500.0}]
    }
    response = client.post("/vendas", json=payload)

    assert response.status_code == 400
    assert "Estoque insuficiente" in response.json()["detail"]

def test_permitir_venda_de_servico_sem_stock():

    db = TestingSessionLocal()
    servico = models.Produto(nome="Formatação de Computador", preco_venda=150.0, estoque_atual=0, is_servico=True, loja_id=1, ativo=True)
    db.add(servico)
    db.commit()
    db.refresh(servico)
    servico_id = servico.id
    db.close()

    payload = {
        "valor_total": 150.0,
        "forma_pagamento": "Dinheiro",
        "itens": [{"produto_id": servico_id, "quantidade": 1, "preco_unitario": 150.0}]
    }
    response = client.post("/vendas", json=payload)

    assert response.status_code == 200
    assert "venda_id" in response.json()


def _criar_cliente_e_os(db):
    cliente = models.Cliente(nome="Cliente Teste", telefone="11999999999", loja_id=1)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    os_db = models.OrdemServico(
        marca="Apple", modelo="iPhone 12", defeito="Não liga",
        cliente_id=cliente.id, usuario_id=1, loja_id=1, ativo=True,
        status="Aguardando Análise",
    )
    db.add(os_db)
    db.commit()
    db.refresh(os_db)
    return cliente.id, os_db.id


def test_tecnico_consegue_atualizar_status_da_os_sem_crashar():
    """Regressão: StatusOS.RECUSADO não existia e causava AttributeError
    (500) em toda atualização de status feita por um usuário 'tecnico'."""
    db = TestingSessionLocal()
    _, os_id = _criar_cliente_e_os(db)
    db.close()

    def override_tecnico():
        return models.Usuario(id=2, loja_id=1, nome="Técnico Teste", cargo="tecnico", ativo=True)

    main.app.dependency_overrides[obter_usuario_logado] = override_tecnico
    try:
        response = client.put(f"/ordens-servico/{os_id}", json={"status": "Aguardando Cliente"})
    finally:
        main.app.dependency_overrides[obter_usuario_logado] = override_usuario_logado

    assert response.status_code == 200
    assert response.json()["status"] == "Aguardando Cliente"


def test_fluxo_completo_de_status_da_os_incluindo_recusa_e_espera_de_peca():
    """Regressão: 'Recusada' e a transição para/da 'Aguardando Peça' eram
    inalcançáveis (a UI enviava valores que o backend sempre rejeitava)."""
    db = TestingSessionLocal()
    _, os_id_recusa = _criar_cliente_e_os(db)
    _, os_id_peca = _criar_cliente_e_os(db)
    db.close()

    r = client.put(f"/ordens-servico/{os_id_recusa}", json={"status": "Aguardando Cliente"})
    assert r.status_code == 200
    r = client.put(f"/ordens-servico/{os_id_recusa}", json={"status": "Recusada"})
    assert r.status_code == 200
    assert r.json()["status"] == "Recusada"

    r = client.put(f"/ordens-servico/{os_id_peca}", json={"status": "Aguardando Cliente"})
    assert r.status_code == 200
    r = client.put(f"/ordens-servico/{os_id_peca}", json={"status": "APROVADO - Fila de Conserto", "valor_orcamento": 100})
    assert r.status_code == 200
    r = client.put(f"/ordens-servico/{os_id_peca}", json={"status": "Aguardando Peça"})
    assert r.status_code == 200
    r = client.put(f"/ordens-servico/{os_id_peca}", json={"status": "APROVADO - Fila de Conserto"})
    assert r.status_code == 200


def test_estoque_nao_pode_ser_alterado_por_usuario_de_outra_loja():
    """Regressão: devolver_reserva/efetivar_baixa não filtravam por loja_id,
    permitindo que um usuário de uma loja mexesse no estoque de outra."""
    db = TestingSessionLocal()
    produto_loja_2 = models.Produto(
        nome="Peça de outra loja", preco_venda=50.0, estoque_atual=10,
        estoque_reservado=0, is_servico=False, loja_id=2, ativo=True,
    )
    db.add(produto_loja_2)
    db.commit()
    db.refresh(produto_loja_2)
    produto_id = produto_loja_2.id
    db.close()

    # Usuário da loja 1 tenta vender (dar baixa em) um produto da loja 2.
    payload = {
        "valor_total": 50.0,
        "forma_pagamento": "Dinheiro",
        "itens": [{"produto_id": produto_id, "quantidade": 1, "preco_unitario": 50.0}]
    }
    response = client.post("/vendas", json=payload)
    assert response.status_code == 404

    db = TestingSessionLocal()
    produto_recarregado = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    assert produto_recarregado.estoque_atual == 10
    db.close()


def test_atualizar_e_reset_de_senha_de_cliente_e_usuario():
    db = TestingSessionLocal()
    cliente_id, _ = _criar_cliente_e_os(db)
    usuario = models.Usuario(id=3, loja_id=1, nome="Func Teste", email="func@teste.com", senha_hash="x", cargo="balcao", ativo=True)
    db.add(usuario)
    db.commit()
    db.close()

    r = client.put(f"/clientes/{cliente_id}", json={"email": "cliente@teste.com", "cpf": "12345678900"})
    assert r.status_code == 200
    assert r.json()["email"] == "cliente@teste.com"
    assert r.json()["cpf"] == "12345678900"

    r = client.put("/usuarios/3/senha", json={"senha": "novaSenha123"})
    assert r.status_code == 200