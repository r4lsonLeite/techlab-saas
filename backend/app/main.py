from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

# IMPORT DOS NOSSOS NOVOS ROUTERS
from routers import auth, usuarios, clientes, estoque, os as router_os, vendas, dashboard, configuracoes

# CONFIGURAÇÃO DE LOGS (Essencial para Produção)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="TechLab API - Tech Ninja SaaS", version="1.0.0")

# PASTAS ESTÁTICAS E UPLOADS
os.makedirs("uploads/evidencias", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# MIDDLEWARE DE SEGURANÇA (CORS)
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def health_check():
    return {"status": "ok", "mensagem": "Motor Tech Ninja a rodar 100%!"}