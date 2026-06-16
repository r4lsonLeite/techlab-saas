from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String
from typing import List

from core.database import get_db
from core.deps import obter_usuario_logado, admin_required
from models import models
from schemas import schemas

router = APIRouter(tags=["Estoque e Logística"])

# 🟢 NOVA FUNÇÃO DE LISTAGEM COM PAGINAÇÃO E BUSCA!
@router.get("/produtos")
def listar_produtos(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.Produto).filter(
        models.Produto.loja_id == user.loja_id, 
        models.Produto.ativo == True
    )

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(
                models.Produto.nome.ilike(termo),
                models.Produto.codigo_barras.ilike(termo),
                models.Produto.categoria.ilike(termo),
                models.Produto.marca.ilike(termo)
            )
        )

    # Ordena pelo ID (mais recentes primeiro)
    return query.order_by(models.Produto.id.desc()).offset(skip).limit(limit).all()

@router.put("/produtos/{id}")
def atualizar_produto(id: int, produto: schemas.ProdutoCreate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    p = db.query(models.Produto).filter(models.Produto.id == id, models.Produto.loja_id == admin.loja_id).first()
    if not p: 
        raise HTTPException(404, "Produto não encontrado")
    
    dados = produto.model_dump(exclude_unset=True)
    dados.pop("loja_id", None) # Removemos para não correr risco de sobrescrever
    
    for key, value in dados.items():
        setattr(p, key, value)
    
    db.commit()
    db.refresh(p)
    return p

@router.get("/produtos")
def listar_produtos(skip: int = 0, limit: int = 50, busca: str = None, categoria: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.Produto).filter(
        models.Produto.loja_id == user.loja_id, 
        models.Produto.ativo == True
    )

    # 🟢 FILTRO DE CATEGORIA ADICIONADO NO SERVIDOR
    if categoria and categoria != "Todos":
        query = query.filter(models.Produto.categoria.ilike(categoria))

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(
                models.Produto.nome.ilike(termo),
                models.Produto.codigo_barras.ilike(termo),
                models.Produto.marca.ilike(termo)
            )
        )

    return query.order_by(models.Produto.id.desc()).offset(skip).limit(limit).all()

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
    return db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.loja_id == user.loja_id).order_by(models.SolicitacaoCompra.id.desc()).all()

@router.put("/solicitacoes/{id}/status")
def atualizar_status_solicitacao(id: int, status_novo: str, db: Session = Depends(get_db), admin=Depends(admin_required)):
    solic = db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.id == id, models.SolicitacaoCompra.loja_id == admin.loja_id).first()
    if not solic: raise HTTPException(404, "Solicitação não encontrada")
    solic.status = status_novo
    db.commit()
    db.refresh(solic)
    return solic