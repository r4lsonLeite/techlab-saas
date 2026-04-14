from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- LOJA ---
class LojaCreate(BaseModel):
    nome_fantasia: str
    cnpj: str
    termo_garantia_troca: Optional[str] = None

class LojaResponse(BaseModel):
    id: int
    nome_fantasia: str
    cnpj: str
    criado_at: datetime
    observacoes_balcao: Optional[str] = None
    class Config:
        from_attributes = True

# --- USUÁRIOS E LOGIN ---
class UsuarioBase(BaseModel):
    nome: str
    email: str
    cargo: str
    loja_id: int
    ativo: Optional[bool] = True # O segredo para não quebrar a tela

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioResponse(UsuarioBase):
    id: int
    class Config:
        from_attributes = True

class UsuarioLogin(BaseModel):
    email: str
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

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

class OSCreate(BaseModel):
    aparelho: str
    defeito: str
    cliente_id: int  # <-- OBRIGATÓRIO PARA O NOME APARECER DEPOIS!
    imei: Optional[str] = None
    senha: Optional[str] = None
    acessorios: Optional[str] = None
    prioridade: Optional[str] = "Normal"


class OSUpdate(BaseModel):
    status: Optional[str] = None
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    valor_orcamento: Optional[float] = None
    foto_url: Optional[str] = None
    pecas_selecionadas: Optional[List[Dict[str, Any]]] = None
    data_inicio_reparo: Optional[datetime] = None
    data_fim_reparo: Optional[datetime] = None

class OSResponse(BaseModel):
    id: int
    aparelho: str
    defeito: str
    status: str
    valor_orcamento: float = 0.0
    
    cliente_id: Optional[int] = None
    usuario_id: Optional[int] = None
    loja_id: Optional[int] = None
    
    # 👉 ESTA LINHA É A CHAVE PARA O NOME APARECER NO REACT:
    cliente_nome: Optional[str] = "Sem Cliente"
    
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    foto_url: Optional[str] = None
    
    class Config:
        from_attributes = True
# --- PRODUTOS E ESTOQUE ---
class ProdutoBase(BaseModel):
    nome: str
    categoria: str = "Outros"
    localizacao: Optional[str] = None
    marca: Optional[str] = None
    codigo_barras: Optional[str] = None
    codigo_modelo: Optional[str] = None
    fornecedor: Optional[str] = None
    preco_custo: float = 0.0
    preco_venda: float
    estoque_atual: int = 0
    estoque_minimo: int = 5

class ProdutoCreate(ProdutoBase):
    loja_id: int = 1

class ProdutoResponse(ProdutoBase):
    id: int
    loja_id: int
    class Config:
        from_attributes = True

# --- VENDAS ---
class ItemVendaCreate(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: float

class VendaCreate(BaseModel):
    valor_total: float
    forma_pagamento: str
    itens: List[ItemVendaCreate]
    os_id: Optional[int] = None

# --- COMPRAS ---
class SolicitacaoCompraBase(BaseModel):
    produto_solicitado: str
    quantidade: int = 1
    origem: str
    prioridade: str = "Normal"
    status: str = "Pendente"
    os_id: Optional[int] = None
    observacao: Optional[str] = None

class SolicitacaoCompraCreate(SolicitacaoCompraBase):
    pass

class SolicitacaoCompraResponse(SolicitacaoCompraBase):
    id: int
    data_solicitacao: datetime
    class Config:
        from_attributes = True
        


