from sqlalchemy.orm import Session
from models import models


class FinanceiroService:
    """
    Centraliza a criação de registros em TransacaoFinanceira.
    Cada venda ou pagamento de OS deve gerar um registro aqui,
    para manter um livro financeiro auditável (entradas/saídas por categoria).
    """

    @staticmethod
    def registrar_entrada(db: Session, loja_id: int, usuario_id: int, categoria: str,
                           valor: float, descricao: str = None, ordem_servico_id: int = None):
        if valor <= 0:
            return None  # não registra entradas zeradas ou negativas

        transacao = models.TransacaoFinanceira(
            loja_id=loja_id,
            usuario_id=usuario_id,
            tipo="ENTRADA",
            categoria=categoria,
            valor=valor,
            descricao=descricao,
            ordem_servico_id=ordem_servico_id,
        )
        db.add(transacao)
        return transacao

    @staticmethod
    def registrar_saida(db: Session, loja_id: int, usuario_id: int, categoria: str,
                         valor: float, descricao: str = None, ordem_servico_id: int = None):
        if valor <= 0:
            return None

        transacao = models.TransacaoFinanceira(
            loja_id=loja_id,
            usuario_id=usuario_id,
            tipo="SAIDA",
            categoria=categoria,
            valor=valor,
            descricao=descricao,
            ordem_servico_id=ordem_servico_id,
        )
        db.add(transacao)
        return transacao
