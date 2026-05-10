from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List
import os
import jwt
from datetime import datetime, timedelta, timezone
from enum import Enum
from collections import defaultdict
from pydantic import BaseModel

# IMPORTS DO SISTEMA
from core.database import engine, get_db
from core import security
from models import models
from schemas import schemas

# IMPORTS DOS SERVIÇOS (A lógica pesada saiu daqui para estes arquivos)
from services.estoque_service import EstoqueService
from services.os_service import OSService, StatusOS

# ==============================
# CONFIGURAÇÃO DE AMBIENTE E SEGURANÇA
# ==============================
app = FastAPI(title="TechLab API - Tech Ninja SaaS")

# Garantir pasta de uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS dinâmico para produção
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = getattr(security, "SECRET_KEY", "techlab_secreto_123")
ALGORITHM = getattr(security, "ALGORITHM", "HS256")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
        d.update({"cliente_nome": o.cliente.nome if o.cliente else "Sem Cliente", "itens": [{"nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in o.itens]})
        ordens.append(d)
    return ordens

@app.post("/ordens-servico", response_model=schemas.OSResponse)
def criar_os(os_data: schemas.OSCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        dados = os_data.model_dump()
        nova = models.OrdemServico(**{k: v for k, v in dados.items() if k in [c.name for c in models.OrdemServico.__table__.columns]}, status=StatusOS.AGUARDANDO_ANALISE.value, loja_id=user.loja_id, usuario_id=user.id, atendente_id=user.id, ativo=True)
        db.add(nova); db.commit(); db.refresh(nova)
        return schemas.OSResponse(**{c.name: getattr(nova, c.name) for c in nova.__table__.columns}, cliente_nome=nova.cliente.nome if nova.cliente else "Sem Cliente", itens=[])
    except Exception as e: db.rollback(); raise HTTPException(500, str(e))

@app.put("/ordens-servico/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, payload: schemas.OSUpdate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_db = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id, models.OrdemServico.loja_id == user.loja_id, models.OrdemServico.ativo == True).with_for_update().first()
        if not os_db: raise HTTPException(404, "OS não encontrada")
        dados = payload.model_dump(exclude_unset=True)

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
    except Exception as e: db.rollback(); raise HTTPException(500, str(e))

def atualizar_os_retorno_helper(os_db):
    d = {c.name: getattr(os_db, c.name) for c in os_db.__table__.columns}
    d.update({"itens": [{"nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in os_db.itens], "cliente_nome": os_db.cliente.nome if os_db.cliente else "Sem Cliente"})
    return d

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

@app.post("/produtos", response_model=schemas.ProdutoResponse)
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    novo = models.Produto(**produto.model_dump(), loja_id=user.loja_id)
    db.add(novo); db.commit(); db.refresh(novo); return novo

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

        nova_venda = models.Venda(valor_total=0, forma_pagamento=venda.forma_pagamento, loja_id=user.loja_id, usuario_id=user.id, os_id=venda.os_id)
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

        nova_venda.valor_total = total; db.commit(); return {"venda_id": nova_venda.id}
    except Exception as e: db.rollback(); raise HTTPException(500, str(e))

# ==============================
# MÓDULO: SOLICITAÇÕES E DASHBOARD
# ==============================
@app.post("/solicitacoes")
def criar_solicitacao(s: schemas.SolicitacaoCompraCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    nova = models.SolicitacaoCompra(**s.model_dump(), loja_id=user.loja_id); db.add(nova); db.commit(); return nova

@app.get("/solicitacoes")
def listar_solicitacoes(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.loja_id == user.loja_id).all()

@app.get("/dashboard/metricas")
def obter_metricas_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    v = db.query(func.sum(models.Venda.valor_total)).filter(models.Venda.loja_id == admin.loja_id).scalar() or 0
    o = db.query(func.sum(models.OrdemServico.valor_orcamento)).filter(models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.status == StatusOS.ENTREGUE.value).scalar() or 0
    return {"faturamento_total": float(v) + float(o), "os_pendentes": db.query(func.count(models.OrdemServico.id)).filter(models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.status.notin_([StatusOS.ENTREGUE.value, StatusOS.CANCELADA.value])).scalar()}

@app.get("/dashboard/graficos")
def obter_graficos_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    # Lógica de agrupamento mensal para gráficos do React
    hoje = datetime.now(timezone.utc); seis_meses = hoje - timedelta(days=180)
    vendas = db.query(func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'), func.sum(models.Venda.valor_total).label('rec')).filter(models.Venda.loja_id == admin.loja_id, models.Venda.data_venda >= seis_meses).group_by('mes').all()
    return {"financeiro": [{"name": v.mes, "Receita": float(v.rec)} for v in vendas]}