from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles

# ✅ IMPORTS CORRIGIDOS (PADRÃO CERTO)
from core.database import engine, get_db
from core import security
from models import models
from schemas import schemas

# Cria as tabelas automaticamente
print("Criando tabelas...")
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- ROTA RAIZ (evita erro 404 no navegador) ---
@app.get("/")
def root():
    return {"status": "API TechLab rodando 🚀"}

app = FastAPI()

# --- NOVO: PREPARANDO A PASTA DE FOTOS ---
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- CRIAR CLIENTE ---
@app.post("/clientes", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    novo_cliente = models.Cliente(**cliente.model_dump(), loja_id=1)
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente


# --- CRIAR ORDEM DE SERVIÇO ---
@app.post("/ordens-servico", response_model=schemas.OSResponse)
def criar_os(os: schemas.OSCreate, db: Session = Depends(get_db)):
    nova_os = models.OrdemServico(
        **os.model_dump(),
        status="Aguardando Análise",
        loja_id=1,
        usuario_id=1
    )
    db.add(nova_os)
    db.commit()
    db.refresh(nova_os)
    return nova_os


# --- LISTAR ORDENS DE SERVIÇO ---
@app.get("/ordens-servico", response_model=List[schemas.OSResponse])
def listar_os(db: Session = Depends(get_db)):
    ordens = db.query(models.OrdemServico).all()

    for o in ordens:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == o.cliente_id).first()
        o.cliente_nome = cliente.nome if cliente else "Desconhecido"

    return ordens


# --- ATUALIZAR ORDEM DE SERVIÇO (DINÂMICO) ---
@app.put("/ordens-servico/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, os_atualizada: schemas.OSUpdate, db: Session = Depends(get_db)):
    db_os = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id).first()

    if not db_os:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    update_data = os_atualizada.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(db_os, key, value)

    db.commit()
    db.refresh(db_os)

    return db_os


# --- EXCLUIR ORDEM DE SERVIÇO ---
@app.delete("/ordens-servico/{os_id}")
def excluir_os(os_id: int, db: Session = Depends(get_db)):
    db_os = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id).first()

    if not db_os:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    db.delete(db_os)
    db.commit()

    return {"mensagem": f"OS {os_id} excluída com sucesso!"}


# --- CRIAR USUÁRIO ---
@app.post("/usuarios", response_model=schemas.UsuarioBase)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()

    if db_user:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    hashed_password = security.get_password_hash(usuario.senha)

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

# --- ROTA: UPLOAD DE FOTO DA OS ---
@app.post("/ordens-servico/{os_id}/foto")
def upload_foto_os(os_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_os = db.query(models.OrdemServico).filter(models.OrdemServico.id == os_id).first()
    if not db_os:
        raise HTTPException(status_code=404, detail="OS não encontrada")

    # Salva a foto na pasta 'uploads' com o número da OS
    file_path = f"uploads/os_{os_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Gera o link e salva no banco de dados
    foto_url = f"http://localhost:8000/{file_path}"
    db_os.foto_url = foto_url
    db.commit()
    db.refresh(db_os)
    
    return {"foto_url": foto_url}


# --- LOGIN (GERAR TOKEN) ---
@app.post("/token", response_model=schemas.Token)
def login_para_acesso_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()

    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = security.create_access_token(data={"sub": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }