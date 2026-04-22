from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, func, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class ItemOS(Base):
    __tablename__ = "itens_os"

    id = Column(Integer, primary_key=True, index=True)
    os_id = Column(Integer, ForeignKey("ordens_servico.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    
    nome_produto = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    preco_unitario = Column(Numeric(10,2), nullable=False)

    os = relationship("OrdemServico", back_populates="itens")
    produto = relationship("Produto")

class Loja(Base):
    __tablename__ = "lojas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    cnpj = Column(String, unique=True, index=True)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    cargo = Column(String, nullable=False, default="tecnico")
    ativo = Column(Boolean, default=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)

    loja = relationship("Loja")

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    telefone = Column(String)
    email = Column(String, nullable=True)
    cpf = Column(String, nullable=True)
    data_cadastro = Column(DateTime(timezone=True), server_default=func.now())
    loja_id = Column(Integer, ForeignKey("lojas.id"))

class OrdemServico(Base):
    __tablename__ = "ordens_servico"

    id = Column(Integer, primary_key=True, index=True)
    
    itens = relationship(
        "ItemOS",
        back_populates="os",
        cascade="all, delete-orphan"
    )

    # DADOS DO APARELHO
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    imei = Column(String, nullable=True)
    senha_aparelho = Column(String, nullable=True)
    acessorios = Column(String, nullable=True)
    
    # ATENDIMENTO E STATUS
    defeito = Column(Text, nullable=False)
    checklist = Column(Text, nullable=True)
    prioridade = Column(String, default="Normal")
    status = Column(String, default="Aguardando Análise")
    observacoes_balcao = Column(Text, nullable=True)
    foto_url = Column(String, nullable=True)
    
    # DADOS TÉCNICOS E FINANCEIROS
    laudo_tecnico = Column(Text, nullable=True)
    pecas_necessarias = Column(Text, nullable=True)
    valor_orcamento = Column(Numeric(10,2), default=0)
    valor_mao_de_obra = Column(Numeric(10,2), default=0) 
    horas_tecnicas = Column(Float, default=0.0) # 🔴 O campo que causou o erro!
    
    # DATAS
    data_entrada = Column(DateTime(timezone=True), server_default=func.now())
    data_conclusao = Column(DateTime(timezone=True), nullable=True)

    # CHAVES ESTRANGEIRAS
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tecnico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    atendente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)
    
    ativo = Column(Boolean, default=True)

    # RELACIONAMENTOS
    cliente = relationship("Cliente")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    tecnico = relationship("Usuario", foreign_keys=[tecnico_id])
    atendente = relationship("Usuario", foreign_keys=[atendente_id])

class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    marca = Column(String, nullable=True)
    codigo_barras = Column(String, index=True, nullable=True)
    codigo_modelo = Column(String, nullable=True)
    fornecedor = Column(String, nullable=True)
    categoria = Column(String, default="Outros") 
    localizacao = Column(String, nullable=True)  
    preco_custo = Column(Float, default=0.0)
    preco_venda = Column(Float, nullable=False)
    estoque_atual = Column(Integer, default=0)
    estoque_minimo = Column(Integer, default=5)
    ativo = Column(Boolean, default=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    
    loja = relationship("Loja")
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="produto")

class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False)
    quantidade = Column(Integer, nullable=False)
    data_movimentacao = Column(DateTime, default=datetime.utcnow)
    observacao = Column(String)
    
    produto = relationship("Produto", back_populates="movimentacoes")
    usuario = relationship("Usuario")

class TransacaoFinanceira(Base):
    __tablename__ = "transacoes_financeiras"
    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False) 
    categoria = Column(String, nullable=False) 
    valor = Column(Float, nullable=False)
    descricao = Column(String)
    data_transacao = Column(DateTime, default=datetime.utcnow)
    ordem_servico_id = Column(Integer, ForeignKey("ordens_servico.id"), nullable=True)
    
    loja = relationship("Loja")
    usuario = relationship("Usuario")
    ordem_servico = relationship("OrdemServico")

class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    valor_total = Column(Numeric(10,2), nullable=False)
    forma_pagamento = Column(String, nullable=False, default="Dinheiro")
    
    # Vínculos para histórico e PDV
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    os_id = Column(Integer, ForeignKey("ordens_servico.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)

    itens = relationship(
        "ItemVenda",
        back_populates="venda",
        cascade="all, delete-orphan"
    )
    
    cliente = relationship("Cliente")
    ordem_servico = relationship("OrdemServico")

class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id = Column(Integer, primary_key=True, index=True)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Numeric(10,2), nullable=False)
    venda_id = Column(Integer, ForeignKey("vendas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)

    venda = relationship("Venda", back_populates="itens")
    produto = relationship("Produto")

class SolicitacaoCompra(Base):
    __tablename__ = "solicitacoes_compra"
    id = Column(Integer, primary_key=True, index=True)
    produto_solicitado = Column(String, nullable=False)
    quantidade = Column(Integer, default=1)
    origem = Column(String, nullable=False) 
    prioridade = Column(String, default="Normal") 
    status = Column(String, default="Pendente") 
    os_id = Column(Integer, ForeignKey("ordens_servico.id", ondelete="SET NULL"), nullable=True)
    observacao = Column(String, nullable=True)
    data_solicitacao = Column(DateTime, default=datetime.utcnow)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)