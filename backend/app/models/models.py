from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, func
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class Loja(Base):
    __tablename__ = "lojas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    cnpj = Column(String, unique=True, index=True)

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    email = Column(String, unique=True, index=True)
    senha_hash = Column(String)
    cargo = Column(String)
    ativo = Column(Boolean, default=True) # A COLUNA QUE FALTAVA!
    loja_id = Column(Integer, ForeignKey("lojas.id"))

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
    marca = Column(String)
    modelo = Column(String)
    aparelho = Column(String) 
    imei = Column(String, nullable=True)
    senha_aparelho = Column(String, nullable=True)
    defeito = Column(Text)
    checklist = Column(Text, nullable=True)
    acessorios = Column(String, nullable=True)
    prioridade = Column(String, default="Normal")
    laudo_tecnico = Column(String, nullable=True)
    pecas_necessarias = Column(String, nullable=True)
    observacoes_balcao = Column(String, nullable=True)
    foto_url = Column(String, nullable=True)
    status = Column(String, default="Aguardando Análise")
    valor_orcamento = Column(Float, default=0.0)
    data_entrada = Column(DateTime(timezone=True), server_default=func.now())
    data_conclusao = Column(DateTime(timezone=True), nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    tecnico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    atendente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True) # Conta os "Clientes Atendidos"
    tecnico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)   # Conta os "Reparos Concluídos"
    horas_tecnicas = Column(Float, default=0.0)                              # Tempo gasto pelo técnico
    valor_mao_de_obra = Column(Float, default=0.0) 

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
    valor_total = Column(Float)
    forma_pagamento = Column(String, nullable=True)
    data_venda = Column(DateTime(timezone=True), server_default=func.now())
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True) 
    usuario_id = Column(Integer, ForeignKey("usuarios.id")) 
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    vendedor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

class ItemVenda(Base):
    __tablename__ = "itens_venda"
    id = Column(Integer, primary_key=True, index=True)
    quantidade = Column(Integer)
    preco_unitario = Column(Float) 
    venda_id = Column(Integer, ForeignKey("vendas.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))

class SolicitacaoCompra(Base):
    __tablename__ = "solicitacoes_compra"
    id = Column(Integer, primary_key=True, index=True)
    produto_solicitado = Column(String, nullable=False)
    quantidade = Column(Integer, default=1)
    origem = Column(String, nullable=False) 
    prioridade = Column(String, default="Normal") 
    status = Column(String, default="Pendente") 
    os_id = Column(Integer, ForeignKey("ordens_servico.id"), nullable=True)
    observacao = Column(String, nullable=True)
    data_solicitacao = Column(DateTime, default=datetime.utcnow)