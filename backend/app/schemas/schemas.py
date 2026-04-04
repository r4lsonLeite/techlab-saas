from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from typing import Optional

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
    observacoes_balcao: Optional[str] = None

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
    
    

# --- CLIENTES ---
class ClienteCreate(BaseModel):
    nome: str
    telefone: str

class ClienteResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    loja_id: int
    
    class Config:
        from_attributes = True

# --- ORDENS DE SERVIÇO ---
class OSCreate(BaseModel):
    aparelho: str
    defeito: str
    cliente_id: int # Só precisamos saber quem é o dono

class OSResponse(BaseModel):
    id: int
    aparelho: str
    defeito: str
    status: str
    valor: float
    cliente_id: int
    usuario_id: int
    loja_id: int
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    class Config:
        from_attributes = True
        
# backend/app/schemas.py

# ... (outras classes)

class OSResponse(BaseModel):
    id: int
    aparelho: str
    defeito: str
    status: str
    valor: float = 0.0
    cliente_id: int
    usuario_id: int
    loja_id: int
    
    
    cliente_nome: str | None = None # O servidor vai preencher isso
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    class Config:
        from_attributes = True       
        
from pydantic import BaseModel, EmailStr
from typing import List, Optional

# --- SCHEMAS DE USUÁRIO E LOGIN ---
class UsuarioBase(BaseModel):
    nome: str
    email: str
    cargo: str

class UsuarioCreate(UsuarioBase):
    senha: str
    loja_id: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    




class OSUpdate(BaseModel):
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    valor: Optional[float] = None
    status: Optional[str] = None
    laudo_tecnico: Optional[str] = None      
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    


# SCHEMA MESTRE DE ATUALIZAÇÃO (Para o Balcão e para a Bancada)
class OSUpdate(BaseModel):
    status: Optional[str] = None
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    valor_orcamento: Optional[float] = None

class OSResponse(BaseModel):
    id: int
    aparelho: str
    defeito: str
    status: str
    valor_orcamento: float
    cliente_id: int
    usuario_id: int
    loja_id: int
    
    # Campos dinâmicos
    cliente_nome: Optional[str] = None
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None

    class Config:
        from_attributes = True