import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


import main
from core.database import get_db
from core.deps import obter_usuario_logado, admin_required
from models import models



SQLALCHEMY_DATABASE_URL = "sqlite:///./banco_de_testes.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Recria o esquema a cada execução para que os testes não dependam do estado
# deixado por corridas anteriores no ficheiro SQLite.
models.Base.metadata.drop_all(bind=engine)
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
main.app.dependency_overrides[admin_required] = override_usuario_logado

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


# ==============================
# CRIAÇÃO DE FUNCIONÁRIOS
# ==============================

def test_criar_funcionario_preserva_o_cargo():
    """Regressão: UsuarioCreate não declarava o campo cargo, pelo que o Pydantic
    o descartava e o router rebentava com AttributeError (500 sem cabeçalhos
    CORS, que o navegador reportava como erro de CORS)."""
    payload = {
        "nome": "Jerónimo",
        "email": "jeronimo@techlab.com",
        "senha": "jeronimo123",
        "cargo": "tecnico",
        "loja_id": 1,
    }
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 200
    assert response.json()["cargo"] == "tecnico"


def test_criar_funcionario_rejeita_cargo_invalido():
    payload = {
        "nome": "Intruso",
        "email": "intruso@techlab.com",
        "senha": "intruso123",
        "cargo": "superuser",
        "loja_id": 1,
    }
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 422


def test_criar_funcionario_rejeita_email_duplicado():
    payload = {
        "nome": "Duplicado",
        "email": "duplicado@techlab.com",
        "senha": "duplicado123",
        "cargo": "balcao",
        "loja_id": 1,
    }
    assert client.post("/usuarios", json=payload).status_code == 200

    response = client.post("/usuarios", json=payload)
    assert response.status_code == 400
    assert "já cadastrado" in response.json()["detail"]


# ==============================
# REDEFINIÇÃO DE PALAVRA-PASSE
# ==============================

def test_redefinir_palavra_passe_altera_o_hash():
    criado = client.post("/usuarios", json={
        "nome": "Reset", "email": "reset@techlab.com",
        "senha": "senhaantiga", "cargo": "tecnico", "loja_id": 1,
    })
    assert criado.status_code == 200
    user_id = criado.json()["id"]

    db = TestingSessionLocal()
    hash_antigo = db.query(models.Usuario).filter_by(id=user_id).first().senha_hash
    db.close()

    response = client.put(f"/usuarios/{user_id}/senha", json={"senha": "senhanova123"})
    assert response.status_code == 200

    db = TestingSessionLocal()
    hash_novo = db.query(models.Usuario).filter_by(id=user_id).first().senha_hash
    db.close()

    assert hash_novo != hash_antigo


def test_redefinir_palavra_passe_de_utilizador_inexistente():
    response = client.put("/usuarios/999999/senha", json={"senha": "qualquer123"})
    assert response.status_code == 404


# ==============================
# FLUXO DE STATUS DA OS
# ==============================

from contextlib import contextmanager

from services.os_service import StatusOS


@contextmanager
def logado_como(cargo):
    """Troca temporariamente o utilizador autenticado do TestClient."""
    anterior = main.app.dependency_overrides[obter_usuario_logado]
    main.app.dependency_overrides[obter_usuario_logado] = lambda: models.Usuario(
        id=1, loja_id=1, nome="Testador", cargo=cargo, ativo=True
    )
    try:
        yield
    finally:
        main.app.dependency_overrides[obter_usuario_logado] = anterior


def criar_os_de_teste(defeito="Tela partida"):
    db = TestingSessionLocal()
    cliente = models.Cliente(nome="Cliente Teste", telefone="88997411386", loja_id=1)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    cliente_id = cliente.id
    db.close()

    resposta = client.post("/ordens-servico", json={
        "marca": "apple", "modelo": "iphone 15",
        "defeito": defeito, "cliente_id": cliente_id,
    })
    assert resposta.status_code == 200
    return resposta.json()["id"]


def test_tecnico_pode_solicitar_peca_e_por_a_os_em_espera():
    """Regressão: 'Aguardando Peça' não constava do FLUXO_VALIDO, por isso o
    pedido de peça ao ADM rebentava com 'Transição proibida'."""
    os_id = criar_os_de_teste()

    with logado_como("tecnico"):
        resposta = client.put(f"/ordens-servico/{os_id}", json={
            "status": StatusOS.AGUARDANDO_PECA.value,
            "laudo_tecnico": "troca de tela e limpeza",
        })

    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["status"] == StatusOS.AGUARDANDO_PECA.value


def test_aguardando_peca_nao_e_um_beco_sem_saida():
    """A peça chega: o técnico tem de conseguir retomar o reparo ou devolver
    o orçamento ao balcão."""
    os_id = criar_os_de_teste()

    with logado_como("tecnico"):
        assert client.put(f"/ordens-servico/{os_id}", json={
            "status": StatusOS.AGUARDANDO_PECA.value}).status_code == 200
        retomada = client.put(f"/ordens-servico/{os_id}", json={
            "status": StatusOS.APROVADO.value})

    assert retomada.status_code == 200, retomada.text
    assert retomada.json()["status"] == StatusOS.APROVADO.value


def test_tecnico_continua_sem_poder_aprovar_o_orcamento():
    os_id = criar_os_de_teste()

    with logado_como("Técnico"):  # com acento, como aparece em contas antigas
        client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.AGUARDANDO_CLIENTE.value})
        resposta = client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.APROVADO.value})

    assert resposta.status_code == 403


def test_balcao_pode_recusar_orcamento():
    """'Recusado - Devolver ao Cliente' era enviado pelo balcão mas não existia
    no enum, pelo que o backend respondia 'Status inválido'."""
    os_id = criar_os_de_teste()

    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.AGUARDANDO_CLIENTE.value})
    resposta = client.put(f"/ordens-servico/{os_id}", json={
        "status": StatusOS.RECUSADO.value, "observacoes_balcao": "Cliente não aprovou."})

    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["status"] == StatusOS.RECUSADO.value


def test_tecnico_pode_pausar_reparo_para_reavaliacao():
    os_id = criar_os_de_teste()

    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.AGUARDANDO_CLIENTE.value})
    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.APROVADO.value})

    with logado_como("tecnico"):
        resposta = client.put(f"/ordens-servico/{os_id}", json={
            "status": StatusOS.AGUARDANDO_REAVALIACAO.value})

    assert resposta.status_code == 200, resposta.text


def test_laudo_do_tecnico_chega_ao_atendimento():
    """O laudo escrito na Bancada tem de vir na listagem que o balcão consulta."""
    os_id = criar_os_de_teste()

    with logado_como("tecnico"):
        client.put(f"/ordens-servico/{os_id}", json={
            "status": StatusOS.AGUARDANDO_CLIENTE.value,
            "laudo_tecnico": "troca de tela e limpeza",
            "pecas_necessarias": "pasta térmica",
        })

    listagem = client.get("/ordens-servico")
    assert listagem.status_code == 200
    os_listada = next(o for o in listagem.json() if o["id"] == os_id)
    assert os_listada["laudo_tecnico"] == "troca de tela e limpeza"
    assert os_listada["pecas_necessarias"] == "pasta térmica"
