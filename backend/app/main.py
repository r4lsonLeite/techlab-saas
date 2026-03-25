from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm # <-- NOVOS
from sqlalchemy.orm import Session
import jwt # <-- NOVO

from .core.database import engine, Base, get_db
from .core import security
from . import models, schemas

# Cria as tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TechLab SaaS API",
    description="Sistema de Gestão para Assistência Técnica",
    version="0.1.0",
    
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# O esquema de segurança que ativa o botão "Authorize" no Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
@app.get("/")
async def root():
    return {"status": "online", "message": "Banco de dados conectado!"}

def get_usuario_logado(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Função 'Segurança de Porta': Pega o Token, verifica se é válido 
    e devolve quem é o usuário atual que está tentando acessar a rota.
    """
    credenciais_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais (Crachá inválido ou expirado)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Tenta abrir o crachá usando a mesma Chave Secreta
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credenciais_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="O token expirou. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise credenciais_exception

    # Se o crachá é verdadeiro, busca o usuário no banco de dados
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if usuario is None:
        raise credenciais_exception
        
    return usuario

# --- NOSSAS ROTAS COMEÇAM AQUI ---

@app.post("/lojas/", response_model=schemas.LojaResponse)
def criar_loja(loja: schemas.LojaCreate, db: Session = Depends(get_db)):
    

    """
    Cria uma nova loja (Tenant) no sistema SaaS.
    """
    # 1. Verifica se já existe uma loja com esse CNPJ
    db_loja = db.query(models.Loja).filter(models.Loja.cnpj == loja.cnpj).first()
    if db_loja:
        raise HTTPException(status_code=400, detail="Este CNPJ já está cadastrado no sistema.")
    
    # 2. Monta o objeto para o Banco de Dados
    nova_loja = models.Loja(
        nome_fantasia=loja.nome_fantasia,
        cnpj=loja.cnpj,
        termo_garantia_troca=loja.termo_garantia_troca
    )
    
    # 3. Salva no banco (Commit)
    db.add(nova_loja)
    db.commit()
    db.refresh(nova_loja) # Atualiza para pegar o ID (1, 2, 3...) gerado pelo banco
    
    return nova_loja

@app.post("/usuarios/", response_model=schemas.UsuarioResponse)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    """
    Cria um novo usuário (ADM, Técnico ou Vendedor) vinculado a uma Loja.
    """
    # 1. Verifica se o email já está em uso
    db_usuario = db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first()
    if db_usuario:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado.")
    
    # 2. Criptografa a senha antes de salvar
    senha_criptografada = security.get_password_hash(usuario.senha)
    
    # 3. Monta o usuário para o banco
    novo_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=senha_criptografada, # Salvamos o hash, não a senha limpa!
        cargo=usuario.cargo,
        loja_id=usuario.loja_id
    )
    
    # 4. Salva no banco
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    
    return novo_usuario

# ... suas rotas de /lojas/ e /usuarios/ ...

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Rota de Login compatível com o botão Authorize do Swagger"""
    # O form_data usa o nome 'username', mas nós sabemos que é o email do usuário
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    # Fabrica o crachá
    token_payload = {
        "sub": usuario.email,
        "loja_id": usuario.loja_id,
        "cargo": usuario.cargo
    }
    cracha_jwt = security.create_access_token(data=token_payload)
    
    return {"access_token": cracha_jwt, "token_type": "bearer"}

@app.get("/sistema/painel")
def ver_painel_protegido(usuario_atual: models.Usuario = Depends(get_usuario_logado)):
    """
    ROTA PROTEGIDA: Só entra quem tem o crachá pendurado!
    """
    return {
        "mensagem": f"Bem-vindo à área protegida, {usuario_atual.nome}!",
        "sua_loja": usuario_atual.loja_id,
        "seu_cargo": usuario_atual.cargo,
        "status": "Acesso Permitido 🔓"
    }