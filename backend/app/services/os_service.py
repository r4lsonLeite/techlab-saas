from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import models
from datetime import datetime, timezone
from enum import Enum

class StatusOS(str, Enum):
    AGUARDANDO_ANALISE = "Aguardando Análise"
    AGUARDANDO_CLIENTE = "Aguardando Cliente"
    APROVADO = "APROVADO - Fila de Conserto"
    PRONTO = "Pronto para Retirada"
    ENTREGUE = "Entregue"
    CANCELADA = "Cancelada"
    AGUARDANDO_PECA = "Aguardando Peça"

class OSService:
    # Máquina de Estados: Quem pode ir para onde (Ponto 6)
    FLUXO_VALIDO = {
        StatusOS.AGUARDANDO_ANALISE: [StatusOS.AGUARDANDO_CLIENTE, StatusOS.CANCELADA],
        StatusOS.AGUARDANDO_CLIENTE: [StatusOS.APROVADO, StatusOS.CANCELADA, StatusOS.AGUARDANDO_ANALISE],
        StatusOS.APROVADO: [StatusOS.PRONTO, StatusOS.CANCELADA],
        StatusOS.PRONTO: [StatusOS.ENTREGUE, StatusOS.APROVADO],
        StatusOS.ENTREGUE: [], # Status final
        StatusOS.CANCELADA: [StatusOS.AGUARDANDO_ANALISE]
    }

    @staticmethod
    def validar_transicao(status_atual: str, novo_status: str):
        if status_atual == novo_status:
            return
        
        try:
            atual = StatusOS(status_atual)
            novo = StatusOS(novo_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Status inválido: {novo_status}")

        if novo not in OSService.FLUXO_VALIDO.get(atual, []):
            raise HTTPException(
                status_code=400, 
                detail=f"Transição proibida: Não é possível mudar de '{status_atual}' para '{novo_status}'."
            )

    @staticmethod
    def atualizar_status(db: Session, os_db: models.OrdemServico, novo_status: str, user_id: int):
        # 1. Validação de fluxo
        OSService.validar_transicao(os_db.status, novo_status)

        # 2. Carimbo automático de datas
        agora = datetime.now(timezone.utc)
        
        if novo_status == StatusOS.APROVADO.value:
            os_db.data_inicio_reparo = agora
        
        if novo_status == StatusOS.PRONTO.value:
            os_db.data_fim_reparo = agora
            # Ponto 5: Aqui poderíamos travar o valor_final para auditoria
            
        os_db.status = novo_status
        return os_db