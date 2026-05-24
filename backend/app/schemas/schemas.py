from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


# =========================
# LOJA
# =========================

class LojaCreate(BaseModel):
    nome: str
    cnpj: str


class LojaResponse(BaseModel):
    id: int
    nome: str
    cnpj: str

    class Config:
        from_attributes = True


# =========================
# USUÁRIO
# =========================

class UsuarioBase(BaseModel):
    nome: str
    email: str
    loja_id: int
    ativo: Optional[bool] = True


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


# =========================
# CLIENTE
# =========================

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


# =========================
# ORDEM DE SERVIÇO
# =========================

class OSCreate(BaseModel):
    marca: str
    modelo: str
    defeito: str
    cliente_id: int

    imei: Optional[str] = None
    senha_aparelho: Optional[str] = None
    acessorios: Optional[str] = None
    prioridade: Optional[str] = "Normal"


class OSUpdate(BaseModel):
    status: Optional[str] = None
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    valor_orcamento: Optional[Decimal] = None
    foto_url: Optional[str] = None
    pecas_selecionadas: Optional[List[dict]] = None

    data_inicio_reparo: Optional[datetime] = None
    data_fim_reparo: Optional[datetime] = None


class OSResponse(BaseModel):
    id: int
    marca: Optional[str] = "Não informada"
    modelo: Optional[str] = "Não informado"
    
    defeito: str
    status: str
    
    valor_orcamento: Decimal = 0
    
    cliente_id: Optional[int] = None
    usuario_id: Optional[int] = None
    loja_id: Optional[int] = None
    
    cliente_nome: Optional[str] = None
    
    laudo_tecnico: Optional[str] = None
    pecas_necessarias: Optional[str] = None
    observacoes_balcao: Optional[str] = None
    foto_url: Optional[str] = None
   
    
    class Config:
        from_attributes = True


# =========================
# PRODUTOS
# =========================

class ProdutoBase(BaseModel):
    nome: str
    categoria: str = "Outros"
    localizacao: Optional[str] = None
    marca: Optional[str] = None
    codigo_barras: Optional[str] = None
    codigo_modelo: Optional[str] = None
    fornecedor: Optional[str] = None
    is_servico: bool = False

    preco_custo: Decimal = 0
    preco_venda: Decimal

    estoque_atual: int = 0
    estoque_minimo: int = 5


class ProdutoCreate(ProdutoBase):
    loja_id: int


class ProdutoResponse(ProdutoBase):
    id: int
    loja_id: int

    class Config:
        from_attributes = True


# =========================
# ITENS DA OS (PEÇAS)
# =========================

class ItemOSCreate(BaseModel):
    produto_id: int
    nome_produto: str
    quantidade: int = 1
    preco_unitario: Decimal


class ItemOSResponse(BaseModel):
    id: int
    produto_id: int
    nome_produto: str
    quantidade: int
    preco_unitario: Decimal

    class Config:
        from_attributes = True


# =========================
# VENDAS
# =========================

class ItemVendaCreate(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: Decimal


class ItemVendaResponse(BaseModel):
    produto_id: int
    quantidade: int
    preco_unitario: Decimal

    class Config:
        from_attributes = True


class VendaCreate(BaseModel):
    valor_total: Decimal
    forma_pagamento: str
    itens: List[ItemVendaCreate]
    os_id: Optional[int] = None
    usuario_id: Optional[int] = None


class VendaResponse(BaseModel):
    id: int
    valor_total: Decimal
    itens: List[ItemVendaResponse]

    class Config:
        from_attributes = True


# =========================
# ESTOQUE
# =========================

class MovimentacaoEstoqueResponse(BaseModel):
    id: int
    produto_id: int
    usuario_id: int
    tipo: str
    quantidade: int
    data_movimentacao: datetime

    class Config:
        from_attributes = True


# =========================
# FINANCEIRO
# =========================

class TransacaoFinanceiraCreate(BaseModel):
    tipo: str
    categoria: str
    valor: Decimal
    descricao: Optional[str] = None
    ordem_servico_id: Optional[int] = None


class TransacaoFinanceiraResponse(BaseModel):
    id: int
    tipo: str
    categoria: str
    valor: Decimal
    descricao: Optional[str]
    data_transacao: datetime

    class Config:
        from_attributes = True


# =========================
# SOLICITAÇÃO DE COMPRA
# =========================

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