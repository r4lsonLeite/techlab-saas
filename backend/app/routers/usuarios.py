from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from core.database import get_db
from core import security
from core.deps import obter_usuario_logado, admin_required
from models import models
from schemas import schemas
from services.os_service import StatusOS

router = APIRouter(prefix="/usuarios", tags=["Usuários e Equipe"])

class ComissaoUpdate(BaseModel):
    taxa_comissao: float

@router.post("", response_model=schemas.UsuarioResponse)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    if db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    novo = models.Usuario(
        nome=usuario.nome, email=usuario.email,
        senha_hash=security.get_password_hash(usuario.senha),
        cargo=usuario.cargo, loja_id=admin.loja_id, ativo=True
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.delete("/{id}")
def deletar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not db_user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db_user.ativo = False
    db.commit()
    return {"mensagem": "Acesso revogado"}

@router.put("/{id}/reativar")
def reativar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not u: raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    u.ativo = True
    db.commit()
    return {"mensagem": f"Acesso de {u.nome} reativado"}

@router.get("")
def listar_usuarios_com_metricas(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    usuarios = db.query(models.Usuario).filter(models.Usuario.loja_id == user.loja_id).offset(skip).limit(limit).all()
    user_ids = [u.id for u in usuarios]
    if not user_ids: return []

    vendas_bulk = db.query(models.Venda.usuario_id, func.count(models.Venda.id).label('qtd'), func.sum(models.Venda.valor_total).label('soma')).filter(models.Venda.usuario_id.in_(user_ids)).group_by(models.Venda.usuario_id).all()
    v_map = {r.usuario_id: {'qtd': r.qtd, 'soma': r.soma or 0} for r in vendas_bulk}

    os_tec_bulk = db.query(models.OrdemServico.tecnico_id, func.count(models.OrdemServico.id).label('qtd'), func.sum(models.OrdemServico.valor_mao_de_obra).label('mao')).filter(models.OrdemServico.tecnico_id.in_(user_ids), models.OrdemServico.status == StatusOS.PRONTO.value).group_by(models.OrdemServico.tecnico_id).all()
    t_map = {r.tecnico_id: {'qtd': r.qtd, 'mao': r.mao or 0} for r in os_tec_bulk}

    res = []
    for u in usuarios:
        taxa = float(u.taxa_comissao or 0) / 100.0
        d = {"id": u.id, "nome": u.nome, "email": u.email, "cargo": u.cargo, "ativo": u.ativo, "taxa_comissao": float(u.taxa_comissao or 0)}
        if u.cargo == "balcao":
            v = v_map.get(u.id, {'qtd': 0, 'soma': 0})
            d.update({"vendas_realizadas": v['qtd'], "comissao_vendas": float(v['soma']) * taxa})
        elif u.cargo == "tecnico":
            t = t_map.get(u.id, {'qtd': 0, 'mao': 0})
            d.update({"reparos_concluidos": t['qtd'], "comissao_reparos": float(t['mao']) * taxa})
        res.append(d)
    return res

@router.put("/{id}/comissao")
def atualizar_comissao(id: int, payload: ComissaoUpdate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not u: raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    u.taxa_comissao = payload.taxa_comissao
    db.commit()
    return {"mensagem": "Comissão atualizada", "nova_taxa": u.taxa_comissao}