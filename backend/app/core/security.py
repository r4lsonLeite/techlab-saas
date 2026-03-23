import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

# Em um sistema real em produção, essa chave fica escondida em um arquivo .env
SECRET_KEY = "techlab_chave_super_secreta_para_fabricar_crachas"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # O crachá dura 7 dias (ótimo para testes)

def get_password_hash(password: str) -> str:
    """Recebe a senha limpa e devolve o hash criptografado usando bcrypt puro"""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha digitada no login bate com o hash salvo"""
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_byte_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_byte_enc)

def create_access_token(data: dict):
    """Fabrica o 'Crachá' (Token JWT) com prazo de validade"""
    to_encode = data.copy()
    # Define quando o crachá vai expirar
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Mistura os dados do usuário com a Chave Secreta para gerar o Token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt