from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# 1. O que nós recebemos do Front-end (Formulário do ADM)
class LojaCreate(BaseModel):
    nome_fantasia: str
    cnpj: str
    termo_garantia_troca: Optional[str] = None

# 2. O que nós devolvemos para o Front-end (Com o ID gerado pelo banco)
class LojaResponse(BaseModel):
    id: int
    nome_fantasia: str
    cnpj: str
    criado_at: datetime

    class Config:
        from_attributes = True  # Isso permite que o Pydantic leia os dados do SQLAlchemy
        
        # ... (mantenha as classes da Loja que já estão aí) ...

# 1. Dados que o Front-end vai enviar para criar o usuário
class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    cargo: str  # Ex: "admin", "tecnico", "vendedor"
    loja_id: int # O ID da loja que acabamos de criar (no seu caso, 0)

# 2. Dados que vamos devolver (NUNCA devolvemos a senha_hash!)
class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    cargo: str
    ativo: bool
    loja_id: int

    class Config:
        from_attributes = True
        
        # ... classes anteriores ...

# O que o usuário envia para fazer login
class UsuarioLogin(BaseModel):
    email: str
    senha: str

# O "Crachá" que o sistema devolve
class Token(BaseModel):
    access_token: str
    token_type: str