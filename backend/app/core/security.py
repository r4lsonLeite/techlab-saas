import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

# ==============================
# CONFIG SEGURA (ENV FIRST)
# ==============================
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY não configurada. Defina a variável de ambiente SECRET_KEY "
        "(no .env local ou nas variáveis de ambiente do Render) antes de iniciar a aplicação."
    )
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

# ==============================
# HASH DE SENHA
# ==============================
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

# ==============================
# VERIFICAÇÃO DE SENHA
# ==============================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

# ==============================
# CRIA TOKEN JWT (CORRIGIDO)
# ==============================
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None
):
    """
    Gera o Token JWT
    - Compatível com uso atual
    - Permite sobrescrever SECRET_KEY (opcional)
    """
    to_encode = data.copy()

    # Define expiração
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    # Usa chave externa se vier, senão usa padrão
    key = secret_key if secret_key else SECRET_KEY

    encoded_jwt = jwt.encode(to_encode, key, algorithm=ALGORITHM)

    return encoded_jwt