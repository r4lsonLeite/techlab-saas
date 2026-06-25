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
from services.financeiro_service import FinanceiroService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendas", tags=["Vendas e PDV"])


@router.get("")
def listar_vendas(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.Venda).options(
        joinedload(models.Venda.cliente),
        joinedload(models.Venda.usuario)
    ).filter(models.Venda.loja_id == user.loja_id)

    if busca:
        termo = f"%{busca}%"
      
        query = query.outerjoin(models.Cliente).outerjoin(models.Usuario, models.Venda.usuario_id == models.Usuario.id).filter(
            or_(
                cast(models.Venda.id, String).ilike(termo),
                models.Cliente.nome.ilike(termo),
                models.Usuario.nome.ilike(termo),
                models.Venda.forma_pagamento.ilike(termo)
            )
        )

    res = query.order_by(models.Venda.data_venda.desc()).offset(skip).limit(limit).all()
    
   
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
        total_servico = 0.0
        total_produtos = 0.0

        if os_v:
            total_servico = float(os_v.valor_orcamento or 0)
            total += total_servico
            for i in os_v.itens: EstoqueService.efetivar_baixa(db, i.produto_id, i.quantidade, user.id, nova_venda.id, True)
            OSService.atualizar_status(db, os_v, StatusOS.ENTREGUE.value, user.id)

        for i in venda.itens:
            p = EstoqueService.efetivar_baixa(db, i.produto_id, i.quantidade, user.id, nova_venda.id, False)
            subtotal_item = float(p.preco_venda) * i.quantidade
            total += subtotal_item
            total_produtos += subtotal_item
            db.add(models.ItemVenda(venda_id=nova_venda.id, produto_id=p.id, quantidade=i.quantidade, preco_unitario=p.preco_venda))

        # Desconto é aplicado sobre o total recalculado a partir dos preços reais do banco,
        # nunca sobre um "valor_total" pronto vindo do cliente (isso permitiria fraude de preço).
        desconto = float(getattr(venda, 'desconto', 0) or 0)
        if desconto < 0:
            raise HTTPException(400, "Desconto não pode ser negativo.")
        if desconto > total:
            raise HTTPException(400, f"Desconto (R$ {desconto:.2f}) não pode ser maior que o total da venda (R$ {total:.2f}).")

        nova_venda.valor_total = total - desconto

        # Registra no livro financeiro: serviço e produtos como categorias separadas,
        # e o desconto (se houver) como uma saída visível, em vez de simplesmente
        # diminuir o valor sem deixar rastro.
        if total_servico > 0:
            FinanceiroService.registrar_entrada(
                db, user.loja_id, vendedor_final_id, "Serviços (OS)",
                total_servico, descricao=f"Pagamento da OS #{os_v.id}", ordem_servico_id=os_v.id
            )
        if total_produtos > 0:
            FinanceiroService.registrar_entrada(
                db, user.loja_id, vendedor_final_id, "Venda de Produtos",
                total_produtos, descricao=f"Venda #{nova_venda.id}"
            )
        if desconto > 0:
            FinanceiroService.registrar_saida(
                db, user.loja_id, vendedor_final_id, "Descontos Concedidos",
                desconto, descricao=f"Desconto aplicado na venda #{nova_venda.id}"
            )

        db.commit()
        return {"venda_id": nova_venda.id, "mensagem": "Venda concluída com sucesso"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e: 
        logger.exception(f"Erro Crítico ao processar pagamento/PDV: {e}")
        db.rollback()
        raise HTTPException(500, "Falha crítica no motor financeiro. A transação foi revertida.")