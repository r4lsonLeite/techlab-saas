from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.deps import obter_usuario_logado, admin_required
from models import models
from schemas import schemas

router = APIRouter(tags=["Estoque e Logística"])

@router.get("/produtos", response_model=List[schemas.ProdutoResponse])
def listar_produtos(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.Produto).filter(models.Produto.loja_id == user.loja_id, models.Produto.ativo == True).all()

@router.post("/produtos")
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados_produto = produto.model_dump()
    dados_produto.pop("loja_id", None)
    novo = models.Produto(**dados_produto, loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.delete("/produtos/{id}")
def deletar_produto(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    p = db.query(models.Produto).filter(models.Produto.id == id, models.Produto.loja_id == admin.loja_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    p.ativo = False
    db.commit()
    return {"mensagem": "Produto removido"}

@router.post("/solicitacoes")
def criar_solicitacao(s: schemas.SolicitacaoCompraCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    nova = models.SolicitacaoCompra(**s.model_dump(), loja_id=user.loja_id)
    db.add(nova)
    db.commit()
    return nova

@router.get("/solicitacoes")
def listar_solicitacoes(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.loja_id == user.loja_id).all()

@router.put("/solicitacoes/{id}/status")
def atualizar_status_solicitacao(id: int, status_novo: str, db: Session = Depends(get_db), admin=Depends(admin_required)):
    solic = db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.id == id, models.SolicitacaoCompra.loja_id == admin.loja_id).first()
    if not solic: raise HTTPException(404, "Solicitação não encontrada")
    solic.status = status_novo
    db.commit()
    db.refresh(solic)
    return solic