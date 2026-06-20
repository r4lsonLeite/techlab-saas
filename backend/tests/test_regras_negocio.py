import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


import main
from core.database import get_db
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
main.app.dependency_overrides[main.obter_usuario_logado] = override_usuario_logado

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