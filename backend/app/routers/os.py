from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
import logging

from core.database import get_db
from core.deps import obter_usuario_logado, admin_required
from models import models
from schemas import schemas
from services.estoque_service import EstoqueService
from services.os_service import OSService, StatusOS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ordens-servico", tags=["Ordens de Serviço"])

def atualizar_os_retorno_helper(os_db):
    d = {c.name: getattr(os_db, c.name) for c in os_db.__table__.columns}
    d.update({
        "itens": [{"id": i.id, "produto_id": i.produto_id, "nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in os_db.itens], 
        "cliente_nome": os_db.cliente.nome if os_db.cliente else "Sem Cliente",
        "cliente_telefone": os_db.cliente.telefone if os_db.cliente else "" 
    })
    return d

from sqlalchemy import or_, cast, String # 👈 Adicione estes imports lá no topo do arquivo se não estiverem

# Substitua a sua função listar_os atual por esta:
@router.get("")
def listar_os(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    query = db.query(models.OrdemServico).options(
        joinedload(models.OrdemServico.itens), 
        joinedload(models.OrdemServico.cliente)
    ).filter(
        models.OrdemServico.loja_id == user.loja_id, 
        models.OrdemServico.ativo == True
    )

    # 🟢 O MOTOR DE BUSCA NO SERVIDOR
    if busca:
        termo = f"%{busca}%"
        # Usamos o outerjoin porque algumas OS podem não ter cliente (teoricamente)
        query = query.outerjoin(models.Cliente).filter(
            or_(
                cast(models.OrdemServico.id, String).ilike(termo),
                models.Cliente.nome.ilike(termo),
                models.OrdemServico.marca.ilike(termo),
                models.OrdemServico.modelo.ilike(termo),
                models.OrdemServico.imei.ilike(termo)
            )
        )

    res = query.order_by(desc(models.OrdemServico.id)).offset(skip).limit(limit).all()
    
    ordens = []
    for o in res:
        d = {c.name: getattr(o, c.name) for c in o.__table__.columns}
        d.update({
            "cliente_nome": o.cliente.nome if o.cliente else "Sem Cliente",
            "cliente_telefone": o.cliente.telefone if o.cliente else "", 
            "itens": [{"id": i.id, "produto_id": i.produto_id, "nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in o.itens]
        })
        ordens.append(d)
    return ordens

@router.post("", response_model=schemas.OSResponse)
def criar_os(os_data: schemas.OSCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        dados = os_data.model_dump()
        nova = models.OrdemServico(**{k: v for k, v in dados.items() if k in [c.name for c in models.OrdemServico.__table__.columns]}, status=StatusOS.AGUARDANDO_ANALISE.value, loja_id=user.loja_id, usuario_id=user.id, atendente_id=user.id, ativo=True)
        db.add(nova); db.commit(); db.refresh(nova)
        return schemas.OSResponse(**{c.name: getattr(nova, c.name) for c in nova.__table__.columns}, cliente_nome=nova.cliente.nome if nova.cliente else "Sem Cliente", itens=[])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao criar OS: {e}")
        db.rollback()
        raise HTTPException(500, "Erro interno ao processar a criação da OS.")

@router.put("/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, payload: schemas.OSUpdate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_db = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id, models.OrdemServico.loja_id == user.loja_id, models.OrdemServico.ativo == True).with_for_update().first()
        if not os_db: raise HTTPException(404, "OS não encontrada")
        dados = payload.model_dump(exclude_unset=True)

        if user.cargo.lower() == "tecnico":
            if "valor_orcamento" in dados:
                raise HTTPException(403, "Falha de Segurança: O Técnico não tem permissão para alterar valores financeiros.")
            if "status" in dados and dados["status"] in [StatusOS.APROVADO.value, StatusOS.RECUSADO.value, StatusOS.ENTREGUE.value]:
                raise HTTPException(403, "Falha de Segurança: O Técnico não tem permissão para faturar ou cancelar OS.")

        if "pecas_selecionadas" in dados:
            pecas = dados.pop("pecas_selecionadas")
            for item in db.query(models.ItemOS).filter(models.ItemOS.os_id == os_id).all():
                EstoqueService.devolver_reserva(db, item.produto_id, item.quantidade, user.id, os_id)
                db.delete(item)
            db.flush()
            for p in pecas:
                prod = EstoqueService.reservar_peca(db, p['produto_id'], int(p.get('qtd', 1)), user.loja_id, user.id, os_id)
                db.add(models.ItemOS(os_id=os_id, produto_id=prod.id, nome_produto=prod.nome, quantidade=int(p.get('qtd', 1)), preco_unitario=float(p.get('preco', prod.preco_venda))))

        if "status" in dados:
            novo_status = str(dados["status"])
            if novo_status == StatusOS.AGUARDANDO_CLIENTE.value and not os_db.tecnico_id: os_db.tecnico_id = user.id
            OSService.atualizar_status(db, os_db, novo_status, user.id)

        for k, v in dados.items():
            if k in {"valor_orcamento", "observacoes_balcao", "laudo_tecnico", "pecas_necessarias"}:
                setattr(os_db, k, float(v) if k == "valor_orcamento" else v)

        db.commit(); db.refresh(os_db)
        return atualizar_os_retorno_helper(os_db)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro crítico ao atualizar OS {os_id}: {e}")
        db.rollback()
        raise HTTPException(500, "Erro interno do servidor ao tentar atualizar a Ordem de Serviço.")

@router.delete("/{id}")
def deletar_os(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    os_db = db.query(models.OrdemServico).filter(models.OrdemServico.id == id, models.OrdemServico.loja_id == admin.loja_id).first()
    if not os_db: raise HTTPException(404, "OS não encontrada")
    for item in os_db.itens: EstoqueService.devolver_reserva(db, item.produto_id, item.quantidade, admin.id, id)
    if os_db.status in [StatusOS.AGUARDANDO_ANALISE.value, StatusOS.AGUARDANDO_CLIENTE.value]: db.delete(os_db)
    else: os_db.status = StatusOS.CANCELADA.value; os_db.ativo = False
    db.commit()
    return {"mensagem": "OS removida"}