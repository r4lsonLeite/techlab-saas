from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String
import logging

from core.database import get_db
from core.deps import obter_usuario_logado
from models import models
from schemas import schemas
from services.estoque_service import EstoqueService
from services.os_service import OSService, StatusOS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendas", tags=["Vendas e PDV"])

# 🟢 NOVA ROTA: HISTÓRICO DE CAIXA PAGINADO!
@router.get("")
def listar_vendas(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.Venda).options(
        joinedload(models.Venda.cliente),
        joinedload(models.Venda.usuario)
    ).filter(models.Venda.loja_id == user.loja_id)

    if busca:
        termo = f"%{busca}%"
        # Precisamos fazer outerjoin porque o cliente pode ser avulso (não cadastrado)
        query = query.outerjoin(models.Cliente).outerjoin(models.Usuario, models.Venda.usuario_id == models.Usuario.id).filter(
            or_(
                cast(models.Venda.id, String).ilike(termo),
                models.Cliente.nome.ilike(termo),
                models.Usuario.nome.ilike(termo),
                models.Venda.forma_pagamento.ilike(termo)
            )
        )

    res = query.order_by(models.Venda.data_venda.desc()).offset(skip).limit(limit).all()
    
    # Formata a resposta para o React ler facilmente
    vendas_formatadas = []
    for v in res:
        vendas_formatadas.append({
            "id": v.id,
            "valor_total": float(v.valor_total),
            "forma_pagamento": v.forma_pagamento,
            "data_venda": v.data_venda,
            "cliente_nome": v.cliente.nome if v.cliente else "Cliente Avulso",
            "vendedor_nome": v.usuario.nome if v.usuario else "Desconhecido",
            "os_id": v.os_id
        })
    return vendas_formatadas

@router.post("")
def finalizar_venda(venda: schemas.VendaCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_v = None
        if hasattr(venda, 'os_id') and venda.os_id:
            os_v = db.query(models.OrdemServico).filter(models.OrdemServico.id == venda.os_id, models.OrdemServico.loja_id == user.loja_id).with_for_update().first()
            if not os_v or os_v.status == StatusOS.ENTREGUE.value: 
                raise HTTPException(400, "OS inválida ou já paga")
            
        vendedor_final_id = getattr(venda, 'usuario_id', None) or user.id
        nova_venda = models.Venda(valor_total=0, forma_pagamento=venda.forma_pagamento, loja_id=user.loja_id, usuario_id=vendedor_final_id, os_id=getattr(venda, 'os_id', None) )
        db.add(nova_venda); db.flush()
        total = 0.0

        if os_v:
            total += float(os_v.valor_orcamento or 0)
            for i in os_v.itens: EstoqueService.efetivar_baixa(db, i.produto_id, i.quantidade, user.id, nova_venda.id, True)
            OSService.atualizar_status(db, os_v, StatusOS.ENTREGUE.value, user.id)

        for i in venda.itens:
            p = EstoqueService.efetivar_baixa(db, i.produto_id, i.quantidade, user.id, nova_venda.id, False)
            total += float(p.preco_venda) * i.quantidade
            db.add(models.ItemVenda(venda_id=nova_venda.id, produto_id=p.id, quantidade=i.quantidade, preco_unitario=p.preco_venda))

        nova_venda.valor_total = getattr(venda, 'valor_total', total)
        db.commit()
        return {"venda_id": nova_venda.id, "mensagem": "Venda concluída com sucesso"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e: 
        logger.exception(f"Erro Crítico ao processar pagamento/PDV: {e}")
        db.rollback()
        raise HTTPException(500, "Falha crítica no motor financeiro. A transação foi revertida.")