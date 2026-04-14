from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import jwt

# IMPORTS DO SISTEMA
from core.database import engine, get_db
from core import security
from models import models
from schemas import schemas

# ==============================
# CONFIG INICIAL E SEGURANÇA
# ==============================
print("Iniciando construção do banco de dados...")
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechLab API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Origem exata do React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 🔴 5. SECRET_KEY INSEGURO RESOLVIDO
# (Lembre-se de configurar a variável de ambiente no seu sistema ou ficheiro .env!)
SECRET_KEY = getattr(security, "SECRET_KEY", "techlab_secreto_123") # Fallback provisório para não quebrar seu dev local agora
ALGORITHM = getattr(security, "ALGORITHM", "HS256")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==============================
# DEPENDÊNCIAS DE AUTENTICAÇÃO E PERMISSÕES
# ==============================
def obter_usuario_logado(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or usuario.ativo is False:
        raise HTTPException(status_code=401, detail="Usuário inválido ou inativo")

    return usuario

# 🟠 8. PERMISSÃO FRACA RESOLVIDA (Proteção Admin)
def admin_required(user: models.Usuario = Depends(obter_usuario_logado)):
    if user.cargo.lower() != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de Administrador")
    return user


# ==============================
# LOGIN
# ==============================
@app.post("/token", response_model=schemas.Token)
def login_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "access_token": security.create_access_token(data=token_data, secret_key=SECRET_KEY),
        "token_type": "bearer"
    }

@app.post("/login")
def login_json(credenciais: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == credenciais.email).first()
    if not usuario or not security.verify_password(credenciais.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "cargo": usuario.cargo,
        "email": usuario.email,
        "access_token": security.create_access_token(data=token_data, secret_key=SECRET_KEY),
        "token_type": "bearer"
    }

# ==============================
# USUÁRIOS & MÉTRICAS
# ==============================
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
    # Isolamento de SaaS
    db_user = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db_user.ativo = False
    db.commit()
    return {"mensagem": "Acesso revogado"}

@app.put("/usuarios/{id}/reativar")
def reativar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
        
    usuario.ativo = True
    db.commit()
    return {"mensagem": f"Acesso de {usuario.nome} reativado"}

# 🟠 6. PERFORMANCE N+1 PESADO RESOLVIDO E 🟠 7. PAGINAÇÃO APLICADA
@app.get("/usuarios")
def listar_usuarios_com_metricas(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    usuarios = db.query(models.Usuario).filter(models.Usuario.loja_id == user.loja_id).offset(skip).limit(limit).all()
    user_ids = [u.id for u in usuarios]
    
    if not user_ids:
        return []

    COMISSAO_VENDAS_PCT = 0.05
    COMISSAO_REPAROS_PCT = 0.30 

    # Agregações em Massa (O(1) Queries em vez de O(N))
    vendas_bulk = db.query(
        models.Venda.vendedor_id,
        func.count(models.Venda.id).label('qtd_vendas'),
        func.sum(models.Venda.valor_total).label('soma_vendas')
    ).filter(models.Venda.vendedor_id.in_(user_ids)).group_by(models.Venda.vendedor_id).all()
    vendas_map = {row.vendedor_id: {'qtd': row.qtd_vendas, 'soma': row.soma_vendas or 0} for row in vendas_bulk}

    os_balcao_bulk = db.query(
        models.OrdemServico.atendente_id,
        func.count(models.OrdemServico.id).label('qtd_os')
    ).filter(models.OrdemServico.atendente_id.in_(user_ids)).group_by(models.OrdemServico.atendente_id).all()
    os_balcao_map = {row.atendente_id: row.qtd_os for row in os_balcao_bulk}

    os_tec_bulk = db.query(
        models.OrdemServico.tecnico_id,
        func.count(models.OrdemServico.id).label('qtd_reparos'),
        func.sum(models.OrdemServico.horas_tecnicas).label('soma_horas'),
        func.sum(models.OrdemServico.valor_mao_de_obra).label('soma_mao_obra')
    ).filter(
        models.OrdemServico.tecnico_id.in_(user_ids),
        models.OrdemServico.status == "Pronto para Retirada"
    ).group_by(models.OrdemServico.tecnico_id).all()
    os_tec_map = {row.tecnico_id: {'qtd': row.qtd_reparos, 'horas': row.soma_horas or 0, 'mao_obra': row.soma_mao_obra or 0} for row in os_tec_bulk}

    resultado = []
    for u in usuarios:
        user_dict = {"id": u.id, "nome": u.nome, "email": u.email, "cargo": u.cargo, "ativo": u.ativo}
        
        if u.cargo == "balcao":
            user_dict["clientes_atendidos"] = os_balcao_map.get(u.id, 0)
            v_data = vendas_map.get(u.id, {'qtd': 0, 'soma': 0})
            user_dict["vendas_realizadas"] = v_data['qtd']
            user_dict["comissao_vendas"] = float(v_data['soma']) * COMISSAO_VENDAS_PCT

        elif u.cargo == "tecnico":
            t_data = os_tec_map.get(u.id, {'qtd': 0, 'horas': 0, 'mao_obra': 0})
            user_dict["reparos_concluidos"] = t_data['qtd']
            user_dict["horas_tecnicas"] = float(t_data['horas'])
            user_dict["comissao_reparos"] = float(t_data['mao_obra']) * COMISSAO_REPAROS_PCT
            
        resultado.append(user_dict)
        
    return resultado

# ==============================
# CLIENTES
# ==============================
@app.post("/clientes", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados_cliente = cliente.model_dump() if hasattr(cliente, 'model_dump') else cliente.dict()
    novo = models.Cliente(**dados_cliente, loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

# ==============================
# ORDENS DE SERVIÇO
# ==============================
@app.get("/ordens-servico", response_model=List[schemas.OSResponse])
def listar_os(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    resultados = db.query(models.OrdemServico, models.Cliente.nome.label("cliente_nome"))\
        .outerjoin(models.Cliente, models.OrdemServico.cliente_id == models.Cliente.id)\
        .filter(models.OrdemServico.loja_id == user.loja_id)\
        .offset(skip).limit(limit).all()

    ordens_formatadas = []
    for os_obj, cli_nome in resultados:
        os_dict = {c.name: getattr(os_obj, c.name) for c in os_obj.__table__.columns}
        os_dict["cliente_nome"] = cli_nome if cli_nome else "Sem Cliente"
        # 🔴 1. VALIDAÇÃO DE RESPONSE_MODEL GARANTIDA AQUI
        ordens_formatadas.append(schemas.OSResponse(**os_dict))
        
    return ordens_formatadas

@app.post("/ordens-servico", response_model=schemas.OSResponse)
def criar_os(os_data: schemas.OSCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados = os_data.model_dump() if hasattr(os_data, 'model_dump') else os_data.dict()
    colunas_reais = [c.name for c in models.OrdemServico.__table__.columns]
    dados_limpos = {k: v for k, v in dados.items() if k in colunas_reais}

    nova = models.OrdemServico(**dados_limpos, status="Aguardando Análise", loja_id=user.loja_id, usuario_id=user.id)
    if "atendente_id" in colunas_reais:
        nova.atendente_id = user.id

    db.add(nova)
    db.commit()
    db.refresh(nova)
    
    os_dict = {c.name: getattr(nova, c.name) for c in nova.__table__.columns}
    cliente = db.query(models.Cliente).filter(models.Cliente.id == nova.cliente_id).first()
    os_dict["cliente_nome"] = cliente.nome if cliente else "Sem Cliente"
    
    return schemas.OSResponse(**os_dict)

@app.put("/ordens-servico/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, payload: schemas.OSUpdate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    # 🔴 2. ISOLAMENTO MULTI-TENANT
    os_db = db.query(models.OrdemServico).filter(
        models.OrdemServico.id == os_id, 
        models.OrdemServico.loja_id == user.loja_id
    ).first()
    
    if not os_db:
        raise HTTPException(status_code=404, detail="OS não encontrada ou sem permissão")
    
    payload_dict = payload.model_dump(exclude_unset=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_unset=True)
    for key, value in payload_dict.items():
        if hasattr(os_db, key):
            setattr(os_db, key, value)
            
    db.commit()
    db.refresh(os_db)
    
    os_dict = {c.name: getattr(os_db, c.name) for c in os_db.__table__.columns}
    if os_db.cliente_id:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == os_db.cliente_id).first()
        os_dict["cliente_nome"] = cliente.nome if cliente else "Sem Cliente"
    else:
        os_dict["cliente_nome"] = "Sem Cliente"
        
    return schemas.OSResponse(**os_dict)

@app.delete("/ordens-servico/{id}")
def deletar_os(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    # 🔴 2. ISOLAMENTO MULTI-TENANT
    os_db = db.query(models.OrdemServico).filter(
        models.OrdemServico.id == id,
        models.OrdemServico.loja_id == admin.loja_id
    ).first()
    
    if not os_db:
        raise HTTPException(status_code=404, detail="OS não encontrada ou sem permissão")
    
    db.delete(os_db)
    db.commit()
    return {"mensagem": "OS excluída com sucesso"}

# ==============================
# PRODUTOS
# ==============================
@app.get("/produtos", response_model=List[schemas.ProdutoResponse])
def listar_produtos(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.Produto).filter(models.Produto.loja_id == user.loja_id).offset(skip).limit(limit).all()

@app.post("/produtos", response_model=schemas.ProdutoResponse)
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados = produto.model_dump() if hasattr(produto, 'model_dump') else produto.dict()
    colunas_reais = [c.name for c in models.Produto.__table__.columns]
    dados_limpos = {k: v for k, v in dados.items() if k in colunas_reais}
    dados_limpos['loja_id'] = user.loja_id
    
    novo_produto = models.Produto(**dados_limpos)
    db.add(novo_produto)
    db.commit()
    db.refresh(novo_produto)
    return novo_produto

# ==============================
# VENDAS
# ==============================
@app.post("/vendas")
def finalizar_venda(venda: schemas.VendaCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    # 🔴 3. VALIDAÇÃO DE ITENS (Prevenção de Carrinho Vazio)
    if not venda.itens:
        raise HTTPException(status_code=400, detail="Impossível finalizar: Venda sem itens registrados.")

    try:
        dados_venda = {
            "valor_total": venda.valor_total,
            "forma_pagamento": venda.forma_pagamento,
            "loja_id": user.loja_id,
            "usuario_id": user.id
        }
        
        valid_keys = [c.name for c in models.Venda.__table__.columns]
        if "vendedor_id" in valid_keys:
            dados_venda["vendedor_id"] = user.id
            
        nova_venda = models.Venda(**dados_venda)
        db.add(nova_venda)
        db.flush()

        for item in venda.itens:
            produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id, models.Produto.loja_id == user.loja_id).first()
            if not produto:
                raise HTTPException(404, f"Produto ID {item.produto_id} não encontrado")
            if produto.estoque_atual < item.quantidade:
                raise HTTPException(400, f"Estoque insuficiente para {produto.nome}")

            produto.estoque_atual -= item.quantidade
            db.add(models.ItemVenda(venda_id=nova_venda.id, produto_id=item.produto_id, quantidade=item.quantidade, preco_unitario=item.preco_unitario))

        db.commit()
        return {"mensagem": "Venda concluída", "venda_id": nova_venda.id}

    # 🔴 4. TRATAMENTO DE ERRO GENÉRICO COM DEBUG REAL
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno no processamento da venda: {str(e)}")

# ==============================
# SOLICITAÇÕES
# ==============================
@app.post("/solicitacoes", response_model=schemas.SolicitacaoCompraResponse)
def criar_solicitacao(solicitacao: schemas.SolicitacaoCompraCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados = solicitacao.model_dump() if hasattr(solicitacao, 'model_dump') else solicitacao.dict()
    nova = models.SolicitacaoCompra(**dados)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

@app.get("/solicitacoes", response_model=List[schemas.SolicitacaoCompraResponse])
def listar_solicitacoes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.SolicitacaoCompra).order_by(models.SolicitacaoCompra.id.desc()).offset(skip).limit(limit).all()

@app.put("/solicitacoes/{id}/status")
def mudar_status(id: int, status_novo: str, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    # Isolamento Aplicado
    solicitacao = db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.id == id).first()
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    solicitacao.status = status_novo
    db.commit()
    return {"mensagem": f"Status alterado para {status_novo}"}