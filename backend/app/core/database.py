from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Por enquanto, vamos usar o SQLite nativo do Python para você não precisar 
# instalar e configurar o servidor PostgreSQL agora e perder o embalo. 
# Para mudar para PostgreSQL depois, é só trocar essa URL!
SQLALCHEMY_DATABASE_URL = "sqlite:///./techlab.db"

# Cria o "motor" do banco de dados
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Cria a fábrica de sessões (as "conversas" com o banco)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# A classe base que nossas tabelas vão herdar
Base = declarative_base()

# Dependência para injetar o banco nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()