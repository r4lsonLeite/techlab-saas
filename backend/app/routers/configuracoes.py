from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from core.database import get_db
from core.deps import obter_usuario_logado
from models import models

router = APIRouter(tags=["Configurações e Uploads"])

MAX_FILE_SIZE = 5 * 1024 * 1024 
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# A logo é impressa numa caixa fixa (220x90 no orçamento A4, 180x70 no cupom).
# Guardar o ficheiro original significava mandar o navegador baixar até 5MB a
# cada impressão para desenhar uns poucos centímetros de papel. Este limite dá
# folga para impressão a 300 DPI e mais nada.
LOGO_TAMANHO_MAXIMO = (700, 300)

@router.post("/lojas/upload-logo")
def upload_logo(file: UploadFile = File(...), user=Depends(obter_usuario_logado)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão não permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo excede o limite de 5MB.")

    imagem = _normalizar_logo(conteudo)

    os.makedirs("uploads", exist_ok=True)
    # Guardada sempre como PNG: a extensão de origem deixa de importar e o
    # cupom/orçamento recebem sempre o mesmo formato.
    nome_seguro = f"loja_{user.loja_id}_{uuid.uuid4().hex}.png"
    caminho_arquivo = f"uploads/{nome_seguro}"

    imagem.save(caminho_arquivo, format="PNG", optimize=True)

    return {
        "url": f"/{caminho_arquivo}",
        "largura": imagem.width,
        "altura": imagem.height,
    }

@router.post("/ordens-servico/{os_id}/foto")
def upload_foto_os(os_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    os_db = db.query(models.OrdemServico).filter(
        models.OrdemServico.id == os_id,
        models.OrdemServico.loja_id == user.loja_id
    ).first()
    if not os_db:
        raise HTTPException(404, "Ordem de serviço não encontrada.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extensão de arquivo não permitida. Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    conteudo = file.file.read()
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(400, "Arquivo de evidência excede o limite de 5MB.")

    os.makedirs("uploads/evidencias", exist_ok=True)
    nome_seguro = f"os_{os_id}_{uuid.uuid4().hex}{ext}"
    caminho_arquivo = f"uploads/evidencias/{nome_seguro}"

    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)

    # Sem isto o ficheiro ficava no disco sem qualquer ligação à OS: o
    # técnico anexava a evidência e ninguém conseguia chegar a ela.
    url = f"/{caminho_arquivo}"
    os_db.foto_url = url
    db.commit()

    return {"mensagem": "Foto salva com segurança!", "url": url}

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


def _normalizar_logo(conteudo: bytes) -> Image.Image:
    """Deixa a logo pronta para impressão: orientação corrigida, reduzida à
    caixa em que é impressa e em PNG (preservando transparência)."""
    try:
        imagem = Image.open(BytesIO(conteudo))
        imagem.load()
    except Image.DecompressionBombError:
        raise HTTPException(400, "Imagem grande demais para ser processada.")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "Não foi possível ler a imagem. Envie um PNG, JPG ou WEBP válido.")

    # Foto tirada com o telemóvel guarda a rotação no EXIF: sem isto a logo
    # podia sair deitada no papel mesmo aparecendo direita no computador.
    imagem = ImageOps.exif_transpose(imagem)

    # Mantém o fundo transparente quando existe; o resto vai para RGB para não
    # arrastar paletas e canais que o PNG final não precisa.
    imagem = imagem.convert("RGBA" if imagem.mode in ("RGBA", "LA", "P") else "RGB")

    # thumbnail só reduz: ampliar uma logo pequena deixá-la-ia borrada.
    imagem.thumbnail(LOGO_TAMANHO_MAXIMO, Image.LANCZOS)

    return imagem
