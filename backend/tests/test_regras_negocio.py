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


def test_pecas_vinculadas_voltam_na_listagem_da_os():
    """A Bancada envia 'pecas_selecionadas' mas a API só devolve 'itens'. Se
    esse contrato mudar, o carrinho do técnico reabre vazio e a gravação
    seguinte apaga as peças já vinculadas."""
    os_id = criar_os_de_teste()

    db = TestingSessionLocal()
    peca = models.Produto(nome="Tela iPhone 15", preco_venda=900.0, estoque_atual=3,
                          categoria="Peças", is_servico=False, loja_id=1, ativo=True)
    servico = models.Produto(nome="Limpeza interna", preco_venda=50.0, estoque_atual=0,
                             categoria="Serviços", is_servico=True, loja_id=1, ativo=True)
    db.add_all([peca, servico])
    db.commit()
    db.refresh(peca)
    db.refresh(servico)
    peca_id, servico_id = peca.id, servico.id
    db.close()

    with logado_como("tecnico"):
        resposta = client.put(f"/ordens-servico/{os_id}", json={"pecas_selecionadas": [
            {"produto_id": peca_id, "qtd": 1, "preco": 900.0},
            {"produto_id": servico_id, "qtd": 1, "preco": 50.0},
        ]})
    assert resposta.status_code == 200, resposta.text

    listagem = client.get("/ordens-servico")
    os_listada = next(o for o in listagem.json() if o["id"] == os_id)
    vinculados = {i["produto_id"]: i for i in os_listada["itens"]}

    # Um serviço sem estoque tem de poder ser vinculado à OS.
    assert peca_id in vinculados and servico_id in vinculados
    assert vinculados[peca_id]["quantidade"] == 1
    assert vinculados[peca_id]["nome_produto"] == "Tela iPhone 15"


# ==============================
# SOLICITAÇÕES DE COMPRA
# ==============================

def test_solicitacao_da_bancada_chega_ao_adm():
    """O técnico pede a peça ao ADM; o ADM tem de a ver na listagem e poder
    responder. Nenhum ecrã consumia GET /solicitacoes."""
    os_id = criar_os_de_teste()

    with logado_como("tecnico"):
        criada = client.post("/solicitacoes", json={
            "produto_solicitado": "Tela Frontal Moto G20",
            "quantidade": 1, "origem": "Bancada", "prioridade": "Urgente",
            "os_id": os_id, "observacao": "Pegar da marca Original China.",
        })
    assert criada.status_code == 200, criada.text
    solicitacao_id = criada.json()["id"]
    assert criada.json()["status"] == "Pendente"

    listagem = client.get("/solicitacoes")
    assert listagem.status_code == 200
    pedido = next(s for s in listagem.json() if s["id"] == solicitacao_id)
    assert pedido["produto_solicitado"] == "Tela Frontal Moto G20"
    assert pedido["origem"] == "Bancada"
    assert pedido["os_id"] == os_id

    resposta = client.put(f"/solicitacoes/{solicitacao_id}/status?status_novo=Recebida")
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["status"] == "Recebida"


def test_falta_anotada_no_pdv_chega_ao_adm():
    with logado_como("balcao"):
        criada = client.post("/solicitacoes", json={
            "produto_solicitado": "Película 3D iPhone 15",
            "quantidade": 1, "origem": "Balcao", "prioridade": "Sugestão",
        })
    assert criada.status_code == 200, criada.text

    listagem = client.get("/solicitacoes")
    assert any(s["id"] == criada.json()["id"] and s["origem"] == "Balcao" for s in listagem.json())


# ==============================
# FOTO DE EVIDÊNCIA
# ==============================

def test_foto_de_evidencia_fica_vinculada_a_os():
    """A rota gravava o ficheiro em disco mas nunca escrevia foto_url na OS:
    a evidência ficava órfã e ninguém lhe chegava."""
    import io

    os_id = criar_os_de_teste()

    with logado_como("tecnico"):
        resposta = client.post(
            f"/ordens-servico/{os_id}/foto",
            files={"file": ("evidencia.png", io.BytesIO(b"conteudo-de-imagem"), "image/png")},
        )
    assert resposta.status_code == 200, resposta.text
    url = resposta.json()["url"]
    assert url.startswith("/uploads/evidencias/")

    listagem = client.get("/ordens-servico")
    os_listada = next(o for o in listagem.json() if o["id"] == os_id)
    assert os_listada["foto_url"] == url


def test_foto_com_extensao_proibida_e_recusada():
    os_id = criar_os_de_teste()
    import io

    with logado_como("tecnico"):
        resposta = client.post(
            f"/ordens-servico/{os_id}/foto",
            files={"file": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        )
    assert resposta.status_code == 400
    assert "não permitida" in resposta.json()["detail"]


# ==============================
# PAGAMENTO DA OS NO PDV
# ==============================

def test_pagamento_da_os_no_pdv_entrega_e_regista_conclusao():
    """A venda marca a OS como Entregue dentro da própria transação — o balcão
    não precisa (nem pode) fazer um PUT extra para 'Entregue'."""
    os_id = criar_os_de_teste()

    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.AGUARDANDO_CLIENTE.value})
    client.put(f"/ordens-servico/{os_id}", json={
        "status": StatusOS.APROVADO.value, "valor_orcamento": 70.0})
    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.PRONTO.value})

    venda = client.post("/vendas", json={
        "forma_pagamento": "Cartão", "itens": [], "os_id": os_id, "desconto": 0.1})
    assert venda.status_code == 200, venda.text

    listagem = client.get("/ordens-servico")
    os_listada = next(o for o in listagem.json() if o["id"] == os_id)
    assert os_listada["status"] == StatusOS.ENTREGUE.value
    assert os_listada["data_conclusao"] is not None


def test_os_ja_paga_nao_e_cobrada_duas_vezes():
    os_id = criar_os_de_teste()

    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.AGUARDANDO_CLIENTE.value})
    client.put(f"/ordens-servico/{os_id}", json={
        "status": StatusOS.APROVADO.value, "valor_orcamento": 70.0})
    client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.PRONTO.value})

    assert client.post("/vendas", json={
        "forma_pagamento": "PIX", "itens": [], "os_id": os_id}).status_code == 200

    repetida = client.post("/vendas", json={
        "forma_pagamento": "PIX", "itens": [], "os_id": os_id})
    assert repetida.status_code == 400
    assert "já foi paga" in repetida.json()["detail"]


def test_balcao_nao_pode_entregar_os_por_fora_do_pdv():
    """Regressão do erro no balcão: o frontend fazia este PUT depois da venda
    e o 400 fazia uma venda concluída parecer falhada."""
    os_id = criar_os_de_teste()

    resposta = client.put(f"/ordens-servico/{os_id}", json={"status": StatusOS.ENTREGUE.value})
    assert resposta.status_code == 400
    assert "PDV" in resposta.json()["detail"]
