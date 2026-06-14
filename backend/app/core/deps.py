from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
import os

from core.database import get_db
from core import security
from models import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Puxa a chave secreta com segurança
SECRET_KEY = os.getenv("SECRET_KEY", getattr(security, "SECRET_KEY", "techlab_secreto_123"))
ALGORITHM = getattr(security, "ALGORITHM", "HS256")

def obter_usuario_logado(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Token expirado ou inválido")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário inválido ou inativo")
    return usuario

def admin_required(user: models.Usuario = Depends(obter_usuario_logado)):
    if user.cargo.lower() not in ["admin", "adm", "administrador"]:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de Administrador")
    return user