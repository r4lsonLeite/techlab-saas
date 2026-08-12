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
    RECUSADO = "Recusada"

class OSService:

    FLUXO_VALIDO = {
        StatusOS.AGUARDANDO_ANALISE: [StatusOS.AGUARDANDO_CLIENTE, StatusOS.CANCELADA],
        StatusOS.AGUARDANDO_CLIENTE: [StatusOS.APROVADO, StatusOS.CANCELADA, StatusOS.AGUARDANDO_ANALISE, StatusOS.RECUSADO],
        StatusOS.APROVADO: [StatusOS.PRONTO, StatusOS.CANCELADA, StatusOS.AGUARDANDO_PECA, StatusOS.AGUARDANDO_CLIENTE],
        StatusOS.PRONTO: [StatusOS.ENTREGUE, StatusOS.APROVADO],
        StatusOS.ENTREGUE: [], # Status final
        StatusOS.CANCELADA: [StatusOS.AGUARDANDO_ANALISE],
        StatusOS.AGUARDANDO_PECA: [StatusOS.APROVADO, StatusOS.CANCELADA],
        StatusOS.RECUSADO: [], # Status final
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
        
        OSService.validar_transicao(os_db.status, novo_status)

        
        agora = datetime.now(timezone.utc)

        if novo_status == StatusOS.APROVADO.value and not os_db.data_inicio_reparo:
            os_db.data_inicio_reparo = agora

        if novo_status == StatusOS.PRONTO.value:
            os_db.data_fim_reparo = agora
            if os_db.data_inicio_reparo:
                horas = (agora - os_db.data_inicio_reparo).total_seconds() / 3600
                os_db.horas_tecnicas = max(0.0, round(horas, 2))

        if novo_status == StatusOS.ENTREGUE.value:
            os_db.data_conclusao = agora

        os_db.status = novo_status
        return os_db