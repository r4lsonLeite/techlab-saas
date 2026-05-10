from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import models

class EstoqueService:
    
    @staticmethod
    def reservar_peca(db: Session, produto_id: int, quantidade: int, loja_id: int, usuario_id: int, os_id: int = None):
        # Trava a linha no banco (with_for_update) para evitar que duas pessoas comprem a mesma peça no mesmo milissegundo
        produto = db.query(models.Produto).filter(
            models.Produto.id == produto_id,
            models.Produto.loja_id == loja_id,
            models.Produto.ativo == True
        ).with_for_update().first()

        if not produto:
            raise HTTPException(status_code=404, detail=f"Produto ID {produto_id} não encontrado ou inativo.")

        estoque_disponivel = produto.estoque_atual - (produto.estoque_reservado or 0)
        
        if estoque_disponivel < quantidade:
            raise HTTPException(
                status_code=400, 
                detail=f"Estoque insuficiente para {produto.nome}. Temos apenas {estoque_disponivel} unidades livres."
            )

        # Efetua a reserva
        produto.estoque_reservado = (produto.estoque_reservado or 0) + quantidade

        # Log de Auditoria
        db.add(models.MovimentacaoEstoque(
            produto_id=produto.id, 
            usuario_id=usuario_id, 
            tipo="RESERVA", 
            quantidade=quantidade, 
            observacao=f"Reserva de peça (OS #{os_id})" if os_id else "Reserva manual"
        ))
        
        return produto

    @staticmethod
    def devolver_reserva(db: Session, produto_id: int, quantidade: int, usuario_id: int, os_id: int = None):
        produto = db.query(models.Produto).filter(models.Produto.id == produto_id).with_for_update().first()
        
        if produto:
            produto.estoque_reservado -= quantidade
            # Trava de segurança extra
            if produto.estoque_reservado < 0:
                produto.estoque_reservado = 0
            
            # Log de Auditoria
            db.add(models.MovimentacaoEstoque(
                produto_id=produto.id, 
                usuario_id=usuario_id, 
                tipo="ESTORNO_RESERVA", 
                quantidade=quantidade, 
                observacao=f"Estorno de peça (OS #{os_id})" if os_id else "Estorno manual"
            ))
        return produto

    @staticmethod
    def efetivar_baixa(db: Session, produto_id: int, quantidade: int, usuario_id: int, venda_id: int, is_os: bool = False):
        produto = db.query(models.Produto).filter(models.Produto.id == produto_id).with_for_update().first()
        
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado para baixa.")

        if is_os:
            # Baixa de OS: Tira da reserva e tira do estoque físico
            produto.estoque_reservado -= quantidade
            if produto.estoque_reservado < 0:
                produto.estoque_reservado = 0
            produto.estoque_atual -= quantidade
            tipo_mov = "BAIXA_VENDA_OS"
        else:
            # Baixa de Balcão (Venda Direta): Verifica disponibilidade e tira do estoque físico
            estoque_disponivel = produto.estoque_atual - (produto.estoque_reservado or 0)
            if estoque_disponivel < quantidade:
                raise HTTPException(status_code=400, detail=f"Estoque insuficiente para vender {produto.nome}.")
            
            produto.estoque_atual -= quantidade
            tipo_mov = "BAIXA_VENDA_DIRETA"

        # Log de Auditoria Final
        db.add(models.MovimentacaoEstoque(
            produto_id=produto.id, 
            usuario_id=usuario_id, 
            tipo=tipo_mov, 
            quantidade=quantidade, 
            observacao=f"Venda confirmada #{venda_id}"
        ))
        
        return produto