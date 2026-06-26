import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env, se existir
load_dotenv()

# 1. Tenta pegar a URL configurada no painel do Render (Neon)
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Se não achar (quando rodar no seu PC), monta a partir de variáveis
#    de ambiente locais (defina-as no seu .env, nunca no código).
if not DATABASE_URL:
    usuario = os.getenv("DB_USER", "postgres")
    senha = os.getenv("DB_PASSWORD")
    host = os.getenv("DB_HOST", "localhost")
    porta = os.getenv("DB_PORT", "5432")
    banco = os.getenv("DB_NAME", "projeto_finall")

    if not senha:
        raise RuntimeError(
            "DATABASE_URL não definida e DB_PASSWORD ausente no .env. "
            "Configure DATABASE_URL (produção) ou DB_USER/DB_PASSWORD/DB_HOST/"
            "DB_PORT/DB_NAME (local) no arquivo .env."
        )

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
        
        