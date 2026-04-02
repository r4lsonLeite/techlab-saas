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
    loja_id = Column(Integer, ForeignKey("lojas.id"))

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True)
    telefone = Column(String)
    email = Column(String, nullable=True) # Novo campo do Figma
    cpf = Column(String, nullable=True)   # Essencial para Vendas reais
    data_cadastro = Column(DateTime(timezone=True), server_default=func.now())
    loja_id = Column(Integer, ForeignKey("lojas.id"))

class OrdemServico(Base):
    __tablename__ = "ordens_servico"
    id = Column(Integer, primary_key=True, index=True)
    
    # Dados do Aparelho (Separados como no Figma)
    marca = Column(String)
    modelo = Column(String)
    aparelho = Column(String) # Vamos manter como "Marca Modelo" juntos para facilitar buscas rápidas
    imei = Column(String, nullable=True)
    senha_aparelho = Column(String, nullable=True)
    
    # Problema e Condições
    defeito = Column(Text)
    acessorios = Column(String, nullable=True)
    prioridade = Column(String, default="Normal")
    checklist = Column(Text, nullable=True) # Guardaremos os itens marcados aqui (ex: "Wi-fi, Tela, Bateria")
    
    # Controle e Valores
    status = Column(String, default="Aguardando Análise")
    valor_orcamento = Column(Float, default=0.0)
    
    # Datas Automáticas
    data_entrada = Column(DateTime(timezone=True), server_default=func.now())
    data_conclusao = Column(DateTime(timezone=True), nullable=True)
    
    # Relacionamentos
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    usuario_id = Column(Integer, ForeignKey("usuarios.id")) # Quem atendeu no balcão
    tecnico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True) # Quem pegou para consertar
    loja_id = Column(Integer, ForeignKey("lojas.id"))

# ==========================================
# NOVAS TABELAS PARA A TELA DE VENDAS / PDV
# ==========================================
# 1. TABELA DE PRODUTOS (Atualizada com Estoque e Custos)
class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    marca = Column(String)
    preco_custo = Column(Float, default=0.0) # O que o ADM pagou
    preco_venda = Column(Float, nullable=False) # O que o Cliente paga
    estoque_atual = Column(Integer, default=0)
    estoque_minimo = Column(Integer, default=5) # Para avisar quando está acabando
    loja_id = Column(Integer, ForeignKey("lojas.id"))

    loja = relationship("Loja")
    # Relacionamento com as movimentações
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="produto")

# 2. NOVA TABELA: HISTÓRICO DE ESTOQUE (Quem tirou, quando e por quê)
class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False) # Quem mexeu
    tipo = Column(String, nullable=False) # "ENTRADA" ou "SAIDA"
    quantidade = Column(Integer, nullable=False)
    data_movimentacao = Column(DateTime, default=datetime.utcnow)
    observacao = Column(String) # Ex: "Usado na OS #12" ou "Compra no fornecedor"

    produto = relationship("Produto", back_populates="movimentacoes")
    usuario = relationship("Usuario")

# 3. NOVA TABELA: CAIXA E FINANCEIRO
class TransacaoFinanceira(Base):
    __tablename__ = "transacoes_financeiras"

    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False) # "RECEITA" ou "DESPESA"
    categoria = Column(String, nullable=False) # "Peças", "Serviço", "Conta de Luz"
    valor = Column(Float, nullable=False)
    descricao = Column(String)
    data_transacao = Column(DateTime, default=datetime.utcnow)
    
    # Opcional: Se esse dinheiro veio de uma Ordem de Serviço específica
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
    
    # Relacionamentos
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True) # Cliente na venda é opcional (venda balcão rápida)
    usuario_id = Column(Integer, ForeignKey("usuarios.id")) # Atendente que fez a venda
    loja_id = Column(Integer, ForeignKey("lojas.id"))

class ItemVenda(Base):
    __tablename__ = "itens_venda"
    id = Column(Integer, primary_key=True, index=True)
    quantidade = Column(Integer)
    preco_unitario = Column(Float) # Salva o preço no dia da venda (caso o preço do produto mude no futuro)
    
    venda_id = Column(Integer, ForeignKey("vendas.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))