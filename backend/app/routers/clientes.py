from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from core.database import get_db
from core.deps import obter_usuario_logado
from models import models
from schemas import schemas
from services.os_service import StatusOS

router = APIRouter(prefix="/clientes", tags=["Clientes e CRM"])

# 🟢 NOVA ROTA: LISTAGEM PAGINADA COM BUSCA!
@router.get("")
def listar_clientes(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.Cliente).filter(models.Cliente.loja_id == user.loja_id)
    
    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(
                models.Cliente.nome.ilike(termo),
                models.Cliente.telefone.ilike(termo),
                models.Cliente.cpf.ilike(termo),
                models.Cliente.email.ilike(termo)
            )
        )
        
    return query.order_by(models.Cliente.id.desc()).offset(skip).limit(limit).all()

@router.post("", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    novo = models.Cliente(**cliente.model_dump(), loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.get("/{cliente_id}/resumo")
def resumo_cliente(cliente_id: int, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    c = db.query(models.Cliente).filter(models.Cliente.id == cliente_id, models.Cliente.loja_id == user.loja_id).first()
    if not c: 
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
    h_os = db.query(models.OrdemServico).filter(models.OrdemServico.cliente_id == cliente_id).all()
    h_v = db.query(models.Venda).filter(models.Venda.cliente_id == cliente_id).all()
    
    return {
        "cliente": {"nome": c.nome, "telefone": c.telefone, "email": getattr(c, 'email', '')},
        "metricas": {
            "total_os": len(h_os), 
            "investimento_total": sum([float(o.valor_orcamento or 0) for o in h_os if o.status == StatusOS.ENTREGUE.value]) + sum([float(v.valor_total or 0) for v in h_v])
        },
        "ultimas_os": h_os[-5:], 
        "ultimas_vendas": h_v[-5:]
    }