from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from core.database import get_db
from core import security
from models import models
from schemas import schemas


router = APIRouter(tags=["Autenticação"])

@router.post("/token", response_model=schemas.Token)
def login_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {"access_token": security.create_access_token(data=token_data), "token_type": "bearer"}

@router.post("/login")
def login_json(credenciais: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == credenciais.email).first()
    if not usuario or not security.verify_password(credenciais.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "id": usuario.id, "nome": usuario.nome, "cargo": usuario.cargo, "email": usuario.email,
        "access_token": security.create_access_token(data=token_data), "token_type": "bearer"
    }