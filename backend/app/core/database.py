import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env, se existir
load_dotenv()

# 1. Tenta pegar a URL configurada no painel do Render (Neon)
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Se não achar (quando rodar no seu PC), usa o banco local
if not DATABASE_URL:
    usuario = "postgres"
    senha = "523880" 
    host = "localhost"
    porta = "5432"
    banco = "projeto_finall" 
    
    senha_segura = urllib.parse.quote_plus(senha)
    DATABASE_URL = f"postgresql://{usuario}:{senha_segura}@{host}:{porta}/{banco}"

# 3. Correção obrigatória do SQLAlchemy para o Render/Neon
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 4. Inicializa a conexão
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()