from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
# Importações usando a sua nova estrutura de pastas
from .core.database import engine, get_db
from .core import security
from .models import models
from .schemas import schemas

# Cria as tabelas no PostgreSQL automaticamente
print("Criando tabelas...")
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- ROTA: CRIAR CLIENTE ---
@app.post("/clientes", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    novo_cliente = models.Cliente(**cliente.model_dump(), loja_id=1) # loja_id fixo por enquanto
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

# --- ROTA: GERAR ORDEM DE SERVIÇO ---
@app.post("/ordens-servico", response_model=schemas.OSResponse)
def criar_os(os: schemas.OSCreate, db: Session = Depends(get_db)):
    # Montamos a OS com todos os novos campos do seu Figma
    nova_os = models.OrdemServico(
        **os.model_dump(),
        aparelho=f"{os.marca} {os.modelo}",
        status="Aguardando Análise",
        loja_id=1,
        usuario_id=1 # Simulando usuário logado
    )
    db.add(nova_os)
    db.commit()
    db.refresh(nova_os)
    return nova_os

# --- ROTA: LISTAR OS PARA O TÉCNICO ---
@app.get("/ordens-servico", response_model=List[schemas.OSResponse])
def listar_os(db: Session = Depends(get_db)):
    ordens = db.query(models.OrdemServico).all()
    # Adiciona o nome do cliente em cada OS para o técnico ver
    for o in ordens:
        o.cliente_nome = db.query(models.Cliente).filter(models.Cliente.id == o.cliente_id).first().nome
    return ordens

# --- ROTA: CRIAR USUÁRIO (O ADMIN) ---
@app.post("/usuarios", response_model=schemas.UsuarioBase)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    # 1. Verifica se o e-mail já existe
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    
    # 2. Criptografa a senha antes de salvar (Segurança!)
    hashed_password = security.get_password_hash(usuario.senha)
    
    # 3. Cria o usuário no banco
    novo_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=hashed_password,
        cargo=usuario.cargo,
        loja_id=usuario.loja_id
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

# --- ROTA: LOGIN (GERAR TOKEN) ---
@app.post("/token", response_model=schemas.Token)
def login_para_acesso_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # 1. Procura o usuário pelo e-mail (que o Swagger envia no campo 'username')
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    # 2. Se não achar ou a senha estiver errada, barra a entrada
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Se estiver tudo certo, cria o "Crachá" (Token)
    access_token = security.create_access_token(data={"sub": usuario.email})
    return {"access_token": access_token, "token_type": "bearer"}