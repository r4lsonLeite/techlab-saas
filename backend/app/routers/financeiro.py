from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.deps import obter_usuario_logado, admin_required
from models import models
from schemas import schemas
from services.financeiro_service import FinanceiroService

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


@router.get("/transacoes", response_model=List[schemas.TransacaoFinanceiraResponse])
def listar_transacoes(
    skip: int = 0,
    limit: int = 50,
    tipo: str = None,
    db: Session = Depends(get_db),
    user=Depends(obter_usuario_logado),
):
    query = db.query(models.TransacaoFinanceira).filter(
        models.TransacaoFinanceira.loja_id == user.loja_id
    )

    if tipo:
        query = query.filter(models.TransacaoFinanceira.tipo == tipo.upper())

    return (
        query.order_by(models.TransacaoFinanceira.data_transacao.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/transacoes", response_model=schemas.TransacaoFinanceiraResponse, status_code=201)
def lancar_transacao_manual(
    dados: schemas.TransacaoFinanceiraCreate,
    db: Session = Depends(get_db),
    admin=Depends(admin_required),
):
    """
    Lançamento manual de despesas/entradas avulsas (ex: aluguel, conta de luz,
    aporte de capital). Vendas e pagamentos de OS já geram registro automático
    e não devem ser lançados aqui.
    """
    tipo = dados.tipo.upper()
    if tipo not in ("ENTRADA", "SAIDA"):
        raise HTTPException(400, "Campo 'tipo' deve ser 'ENTRADA' ou 'SAIDA'.")

    if dados.valor <= 0:
        raise HTTPException(400, "O valor da transação deve ser maior que zero.")

    transacao = models.TransacaoFinanceira(
        loja_id=admin.loja_id,
        usuario_id=admin.id,
        tipo=tipo,
        categoria=dados.categoria,
        valor=dados.valor,
        descricao=dados.descricao,
        ordem_servico_id=dados.ordem_servico_id,
    )
    db.add(transacao)
    db.commit()
    db.refresh(transacao)
    return transacao
