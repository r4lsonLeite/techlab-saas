import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Coloque aqui os dados exatos do seu DBeaver
usuario = "postgres"
senha = "523880" # <-- Coloque sua senha real aqui
host = "localhost"
porta = "5432"
banco = "techlab"

# 2. A MÁGICA: Isso converte o 'ã' ou '@' em algo que a URL aceita
senha_segura = urllib.parse.quote_plus(senha)

# 3. Monta a URL usando a senha protegida
SQLALCHEMY_DATABASE_URL = f"postgresql://{usuario}:{senha_segura}@{host}:{porta}/{banco}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()