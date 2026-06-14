from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List
from pathlib import Path
import shutil
import os
import jwt
import uuid
import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from collections import defaultdict
from pydantic import BaseModel
from fastapi import UploadFile, File

# IMPORTS DO SISTEMA
from core.database import engine, get_db
from core import security
from models import models
from schemas import schemas

# IMPORTS DOS SERVIÇOS
from services.estoque_service import EstoqueService
from services.os_service import OSService, StatusOS

# ==============================
# 0. LOGS E SEGURANÇA BASE
# ==============================
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# 🔴 REGRA CRÍTICA DE PRODUÇÃO: SECRET_KEY
# Tenta pegar das variáveis de ambiente ou do ficheiro core/security.py
SECRET_KEY = os.getenv("SECRET_KEY", getattr(security, "SECRET_KEY", None))
if not SECRET_KEY or SECRET_KEY == "techlab_secreto_123":
    logger.warning("⚠️ ALERTA DE SEGURANÇA: A usar SECRET_KEY padrão ou não configurada! Mude isto em ambiente de produção.")
    SECRET_KEY = "techlab_secreto_123" # Fallback temporário para não quebrar o seu ambiente de testes agora

ALGORITHM = getattr(security, "ALGORITHM", "HS256")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==============================
# CONFIGURAÇÃO DE AMBIENTE
# ==============================
app = FastAPI(title="TechLab API - Tech Ninja SaaS")

os.makedirs("uploads/evidencias", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# DEPENDÊNCIAS DE AUTENTICAÇÃO
# ==============================
def obter_usuario_logado(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário inválido ou inativo")
    return usuario

def admin_required(user: models.Usuario = Depends(obter_usuario_logado)):
    if user.cargo.lower() not in ["admin", "adm", "administrador"]:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de Administrador")
    return user

# ==============================
# MÓDULO: AUTENTICAÇÃO E LOGIN
# ==============================
@app.post("/token", response_model=schemas.Token)
def login_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {"access_token": security.create_access_token(data=token_data), "token_type": "bearer"}

@app.post("/login")
def login_json(credenciais: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == credenciais.email).first()
    if not usuario or not security.verify_password(credenciais.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "id": usuario.id, "nome": usuario.nome, "cargo": usuario.cargo, "email": usuario.email,
        "access_token": security.create_access_token(data=token_data), "token_type": "bearer"
    }

# ==============================
# MÓDULO: USUÁRIOS E COMISSÕES
# ==============================
class ComissaoUpdate(BaseModel):
    taxa_comissao: float

@app.post("/usuarios", response_model=schemas.UsuarioResponse)
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

@app.delete("/usuarios/{id}")
def deletar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not db_user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db_user.ativo = False
    db.commit()
    return {"mensagem": "Acesso revogado"}

@app.put("/usuarios/{id}/reativar")
def reativar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not u: raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    u.ativo = True
    db.commit()
    return {"mensagem": f"Acesso de {u.nome} reativado"}

@app.get("/usuarios")
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

@app.put("/usuarios/{id}/comissao")
def atualizar_comissao(id: int, payload: ComissaoUpdate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    u = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not u: raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    u.taxa_comissao = payload.taxa_comissao
    db.commit()
    return {"mensagem": "Comissão atualizada", "nova_taxa": u.taxa_comissao}

# ==============================
# MÓDULO: CLIENTES E CRM
# ==============================
@app.post("/clientes", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    novo = models.Cliente(**cliente.model_dump(), loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.get("/clientes/{cliente_id}/resumo")
def resumo_cliente(cliente_id: int, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    c = db.query(models.Cliente).filter(models.Cliente.id == cliente_id, models.Cliente.loja_id == user.loja_id).first()
    if not c: raise HTTPException(status_code=404, detail="Cliente não encontrado")
    h_os = db.query(models.OrdemServico).filter(models.OrdemServico.cliente_id == cliente_id).all()
    h_v = db.query(models.Venda).filter(models.Venda.cliente_id == cliente_id).all()
    return {
        "cliente": {"nome": c.nome, "telefone": c.telefone},
        "metricas": {"total_os": len(h_os), "investimento_total": sum([float(o.valor_orcamento or 0) for o in h_os if o.status == StatusOS.ENTREGUE.value]) + sum([float(v.valor_total or 0) for v in h_v])},
        "ultimas_os": h_os[-5:], "ultimas_vendas": h_v[-5:]
    }

# ==============================
# MÓDULO: ORDENS DE SERVIÇO (OS)
# ==============================
@app.get("/ordens-servico")
def listar_os(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    res = db.query(models.OrdemServico).options(joinedload(models.OrdemServico.itens), joinedload(models.OrdemServico.cliente)).filter(models.OrdemServico.loja_id == user.loja_id, models.OrdemServico.ativo == True).order_by(desc(models.OrdemServico.id)).offset(skip).limit(limit).all()
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

def atualizar_os_retorno_helper(os_db):
    d = {c.name: getattr(os_db, c.name) for c in os_db.__table__.columns}
    d.update({
        "itens": [{"id": i.id, "produto_id": i.produto_id, "nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in os_db.itens], 
        "cliente_nome": os_db.cliente.nome if os_db.cliente else "Sem Cliente",
        "cliente_telefone": os_db.cliente.telefone if os_db.cliente else "" 
    })
    return d

@app.post("/ordens-servico", response_model=schemas.OSResponse)
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

@app.put("/ordens-servico/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, payload: schemas.OSUpdate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_db = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id, models.OrdemServico.loja_id == user.loja_id, models.OrdemServico.ativo == True).with_for_update().first()
        if not os_db: raise HTTPException(404, "OS não encontrada")
        dados = payload.model_dump(exclude_unset=True)

        # 🔴 BLINDAGEM DE SEGURANÇA: Impede Técnicos de forjarem valores e status de faturamento
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

@app.delete("/ordens-servico/{id}")
def deletar_os(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    os_db = db.query(models.OrdemServico).filter(models.OrdemServico.id == id, models.OrdemServico.loja_id == admin.loja_id).first()
    if not os_db: raise HTTPException(404, "OS não encontrada")
    for item in os_db.itens: EstoqueService.devolver_reserva(db, item.produto_id, item.quantidade, admin.id, id)
    if os_db.status in [StatusOS.AGUARDANDO_ANALISE.value, StatusOS.AGUARDANDO_CLIENTE.value]: db.delete(os_db)
    else: os_db.status = StatusOS.CANCELADA.value; os_db.ativo = False
    db.commit(); return {"mensagem": "OS removida"}

# ==============================
# MÓDULO: ESTOQUE E PRODUTOS
# ==============================
@app.get("/produtos", response_model=List[schemas.ProdutoResponse])
def listar_produtos(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.Produto).filter(models.Produto.loja_id == user.loja_id, models.Produto.ativo == True).all()

@app.post("/produtos")
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados_produto = produto.model_dump()
    dados_produto.pop("loja_id", None)
    novo = models.Produto(**dados_produto, loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.delete("/produtos/{id}")
def deletar_produto(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    p = db.query(models.Produto).filter(models.Produto.id == id, models.Produto.loja_id == admin.loja_id).first()
    if not p: raise HTTPException(404, "Produto não encontrado")
    p.ativo = False; db.commit(); return {"mensagem": "Produto removido"}

# ==============================
# MÓDULO: VENDAS / PDV
# ==============================
@app.post("/vendas")
def finalizar_venda(venda: schemas.VendaCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_v = None
        if hasattr(venda, 'os_id') and venda.os_id:
            os_v = db.query(models.OrdemServico).filter(models.OrdemServico.id == venda.os_id, models.OrdemServico.loja_id == user.loja_id).with_for_update().first()
            if not os_v or os_v.status == StatusOS.ENTREGUE.value: raise HTTPException(400, "OS inválida ou já paga")
            
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

        nova_venda.valor_total = total
        db.commit()
        return {"venda_id": nova_venda.id, "mensagem": "Venda concluída com sucesso"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e: 
        logger.exception(f"Erro Crítico ao processar pagamento/PDV: {e}")
        db.rollback()
        raise HTTPException(500, "Falha crítica no motor financeiro. A transação foi revertida.")

# ==============================
# MÓDULO: SOLICITAÇÕES E DASHBOARD
# ==============================
@app.post("/solicitacoes")
def criar_solicitacao(s: schemas.SolicitacaoCompraCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    nova = models.SolicitacaoCompra(**s.model_dump(), loja_id=user.loja_id); db.add(nova); db.commit(); return nova

@app.get("/solicitacoes")
def listar_solicitacoes(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.loja_id == user.loja_id).all()

@app.put("/solicitacoes/{id}/status")
def atualizar_status_solicitacao(id: int, status_novo: str, db: Session = Depends(get_db), admin=Depends(admin_required)):
    solic = db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.id == id, models.SolicitacaoCompra.loja_id == admin.loja_id).first()
    if not solic: raise HTTPException(404, "Solicitação não encontrada")
    solic.status = status_novo; db.commit(); db.refresh(solic); return solic

@app.get("/dashboard/metricas")
def obter_metricas_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    v = db.query(func.sum(models.Venda.valor_total)).filter(models.Venda.loja_id == admin.loja_id).scalar() or 0
    o = db.query(func.sum(models.OrdemServico.valor_orcamento)).filter(models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.status == StatusOS.ENTREGUE.value).scalar() or 0
    return {"faturamento_total": float(v) + float(o), "os_pendentes": db.query(func.count(models.OrdemServico.id)).filter(models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.status.notin_([StatusOS.ENTREGUE.value, StatusOS.CANCELADA.value])).scalar()}

@app.get("/dashboard/graficos")
def obter_graficos_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    hoje = datetime.now(timezone.utc)
    seis_meses_atras = hoje - timedelta(days=180)

    # 1. DRE MENSAL E TICKET MÉDIO
    vendas_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.Venda.valor_total).label('receita'),
        func.count(models.Venda.id).label('qtd_vendas')
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        func.to_char(models.Venda.data_venda, 'MM/YYYY')
    ).order_by(
        func.min(models.Venda.data_venda) 
    ).all()

    custos_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.ItemVenda.quantidade * getattr(models.Produto, 'preco_custo', 0)).label('custo_total')
    ).select_from(models.Venda).join(
        models.ItemVenda, models.ItemVenda.venda_id == models.Venda.id
    ).join(
        models.Produto, models.ItemVenda.produto_id == models.Produto.id
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        func.to_char(models.Venda.data_venda, 'MM/YYYY')
    ).all()

    mapa_custos = {c.mes: float(c.custo_total or 0) for c in custos_mensais}

    dados_financeiros = []
    total_receita = 0
    total_vendas = 0

    for v in vendas_mensais:
        mes = v.mes
        receita = float(v.receita or 0)
        custo = mapa_custos.get(mes, 0.0)
        lucro_real = receita - custo 
        
        ticket_medio = receita / v.qtd_vendas if v.qtd_vendas > 0 else 0
        total_receita += receita
        total_vendas += v.qtd_vendas

        dados_financeiros.append({
            "name": mes,
            "Receita": receita,
            "Custo": custo,
            "Lucro": lucro_real,
            "TicketMedio": ticket_medio
        })

    ticket_medio_geral = total_receita / total_vendas if total_vendas > 0 else 0

    # 2. VENDAS POR CATEGORIA
    categorias = db.query(
        models.Produto.categoria,
        func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('valor')
    ).join(
        models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id
    ).join(
        models.Venda, models.ItemVenda.venda_id == models.Venda.id
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        models.Produto.categoria
    ).all()

    dados_categorias = [{"name": c.categoria or "Outros", "value": float(c.valor or 0)} for c in categorias]

    # 3. RANKING DE PRODUTOS
    ranking = db.query(
        models.Produto.nome,
        func.sum(models.ItemVenda.quantidade).label('qtd'),
        func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('receita')
    ).join(
        models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id
    ).join(
        models.Venda, models.ItemVenda.venda_id == models.Venda.id
    ).filter(
        models.Venda.loja_id == admin.loja_id
    ).group_by(
        models.Produto.id
    ).order_by(
        desc('qtd')
    ).limit(5).all()

    dados_ranking = [{"nome": r.nome, "qtd": int(r.qtd), "receita": float(r.receita or 0)} for r in ranking]

    # 4. TEMPO MÉDIO DE REPARO
    media_segundos = db.query(
        func.avg(func.extract('epoch', models.OrdemServico.data_conclusao - models.OrdemServico.data_entrada))
    ).filter(
        models.OrdemServico.loja_id == admin.loja_id,
        models.OrdemServico.data_entrada.isnot(None),
        models.OrdemServico.data_conclusao.isnot(None),
        models.OrdemServico.status == StatusOS.ENTREGUE.value 
    ).scalar()

    tempo_medio_horas = round(media_segundos / 3600, 1) if media_segundos else 0.0

    return {
        "financeiro": dados_financeiros,
        "categorias": dados_categorias if dados_categorias else [{"name": "Sem dados", "value": 1}],
        "ranking_produtos": dados_ranking,
        "kpis_extras": {
            "ticket_medio_geral": round(ticket_medio_geral, 2),
            "tempo_medio_reparo_horas": tempo_medio_horas
        }
    }

# ==============================
# MÓDULO: UPLOADS SEGUROS
# ==============================
MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB Limite Máximo
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

@app.post("/lojas/upload-logo")
def upload_logo(file: UploadFile = File(...), user=Depends(obter_usuario_logado)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão de arquivo não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo excede o limite de 5MB.")

    os.makedirs("uploads", exist_ok=True)
    # 🔴 Proteção: ID único em vez de usar o nome original (Path Traversal fix)
    nome_seguro = f"loja_{user.loja_id}_{uuid.uuid4().hex}{ext}"
    caminho_arquivo = f"uploads/{nome_seguro}"
    
    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)
        
    return {"url": f"/{caminho_arquivo}"}

@app.put("/lojas/configuracoes")
def atualizar_configuracoes_loja(dados: dict, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    loja = db.query(models.Loja).filter(models.Loja.id == user.loja_id).first()
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    for campo, valor in dados.items():
        if hasattr(loja, campo):
            setattr(loja, campo, valor)
            
    db.commit()
    return {"mensagem": "Configurações salvas com sucesso!"}

@app.get("/lojas/configuracoes")
def obter_configuracoes_loja(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    loja = db.query(models.Loja).filter(models.Loja.id == user.loja_id).first()
    return loja

@app.post("/ordens-servico/{os_id}/foto")
def upload_foto_os(os_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão de arquivo não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")
    
    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo de evidência excede o limite de 5MB.")

    os.makedirs("uploads/evidencias", exist_ok=True)
    
    # 🔴 Proteção com UUID
    nome_seguro = f"os_{os_id}_{uuid.uuid4().hex}{ext}"
    caminho_arquivo = f"uploads/evidencias/{nome_seguro}"
    
    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)
        
    return {"mensagem": "Foto de evidência salva com segurança!", "url": f"/{caminho_arquivo}"}