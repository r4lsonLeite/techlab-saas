from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path

from core.database import get_db
from core.deps import obter_usuario_logado
from models import models

router = APIRouter(tags=["Configurações e Uploads"])

MAX_FILE_SIZE = 5 * 1024 * 1024 
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

@router.post("/lojas/upload-logo")
def upload_logo(file: UploadFile = File(...), user=Depends(obter_usuario_logado)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo excede o limite de 5MB.")

    os.makedirs("uploads", exist_ok=True)
    nome_seguro = f"loja_{user.loja_id}_{uuid.uuid4().hex}{ext}"
    caminho_arquivo = f"uploads/{nome_seguro}"
    
    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)
        
    return {"url": f"/{caminho_arquivo}"}

@router.post("/ordens-servico/{os_id}/foto")
def upload_foto_os(os_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão de arquivo não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")
    
    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo de evidência excede o limite de 5MB.")

    os.makedirs("uploads/evidencias", exist_ok=True)
    nome_seguro = f"os_{os_id}_{uuid.uuid4().hex}{ext}"
    caminho_arquivo = f"uploads/evidencias/{nome_seguro}"
    
    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)
        
    return {"mensagem": "Foto salva com segurança!", "url": f"/{caminho_arquivo}"}

@router.put("/lojas/configuracoes")
def atualizar_configuracoes_loja(dados: dict, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    loja = db.query(models.Loja).filter(models.Loja.id == user.loja_id).first()
    if not loja: raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    for campo, valor in dados.items():
        if hasattr(loja, campo): setattr(loja, campo, valor)
            
    db.commit()
    return {"mensagem": "Configurações salvas com sucesso!"}

@router.get("/lojas/configuracoes")
def obter_configuracoes_loja(db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.Loja).filter(models.Loja.id == user.loja_id).first()