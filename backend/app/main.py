from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
import logging
from core.database import engine, Base
from core.rate_limit import limiter
from models import models

from routers import auth, usuarios, clientes, estoque, os as router_os, vendas, dashboard, configuracoes, financeiro

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="TechLab API - Tech Ninja SaaS", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

os.makedirs("uploads/evidencias", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

allowed_origins = [
    "http://localhost:5173",
    "https://techlab-saas.vercel.app",
    "https://techlab-saas-git-main-railson1.vercel.app",
    "https://techlab-saas-n46xpcxf9-railson1.vercel.app"
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    allowed_origins.extend(
        [origin.strip() for origin in env_origins.split(",")]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sem este handler, uma exceção não tratada em qualquer rota resulta num 500
# devolvido pelo ServerErrorMiddleware do Starlette, que fica FORA do
# CORSMiddleware — a resposta sai sem cabeçalhos CORS e o navegador reporta
# isso como bloqueio de CORS, mascarando o erro real do servidor.
@app.exception_handler(Exception)
async def tratador_excecoes_globais(request: Request, exc: Exception):
    logger.exception("Erro não tratado em %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor. Tente novamente em instantes."},
    )

# ==============================
# REGISTRO DAS ROTAS MODULARES
# ==============================
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clientes.router)
app.include_router(estoque.router)
app.include_router(router_os.router)
app.include_router(vendas.router)
app.include_router(dashboard.router)
app.include_router(configuracoes.router)
app.include_router(financeiro.router)

@app.get("/")
def health_check():
    return {"status": "ok", "mensagem": "Motor Tech Ninja a rodar 100%!"}

