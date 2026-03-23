from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .core.database import Base

class Loja(Base):
    __tablename__ = "lojas"

    id = Column(Integer, primary_key=True, index=True)
    nome_fantasia = Column(String(150), nullable=False)
    cnpj = Column(String(18), unique=True, index=True)
    termo_garantia_troca = Column(String, nullable=True) # Aquele texto do cupom
    criado_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relação: Uma loja tem vários usuários
    usuarios = relationship("Usuario", back_populates="loja")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    cargo = Column(String(50), nullable=False) # 'admin', 'tecnico', 'vendedor'
    ativo = Column(Boolean, default=True)
    
    # Chave estrangeira ligando à Loja (O Multi-tenancy!)
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    
    # Relação de volta para a loja
    loja = relationship("Loja", back_populates="usuarios")