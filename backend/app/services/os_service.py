from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import models
from datetime import datetime, timezone
from enum import Enum

class StatusOS(str, Enum):
    AGUARDANDO_ANALISE = "Aguardando Análise"
    AGUARDANDO_CLIENTE = "Aguardando Cliente"
    AGUARDANDO_REAVALIACAO = "Aguardando Reavaliação"
    APROVADO = "APROVADO - Fila de Conserto"
    RECUSADO = "Recusado - Devolver ao Cliente"
    PRONTO = "Pronto para Retirada"
    ENTREGUE = "Entregue"
    CANCELADA = "Cancelada"
    AGUARDANDO_PECA = "Aguardando Peça"

class OSService:

    # Cada estado lista para onde pode seguir. Estados sem saída (ou em falta
    # neste mapa) tornam-se becos sem saída, por isso qualquer estado usado
    # pelo frontend tem de constar aqui.
    FLUXO_VALIDO = {
        StatusOS.AGUARDANDO_ANALISE: [
            StatusOS.AGUARDANDO_CLIENTE, StatusOS.AGUARDANDO_PECA, StatusOS.CANCELADA
        ],
        StatusOS.AGUARDANDO_CLIENTE: [
            StatusOS.APROVADO, StatusOS.RECUSADO, StatusOS.AGUARDANDO_ANALISE,
            StatusOS.AGUARDANDO_PECA, StatusOS.CANCELADA
        ],
        StatusOS.AGUARDANDO_REAVALIACAO: [
            StatusOS.APROVADO, StatusOS.RECUSADO, StatusOS.AGUARDANDO_ANALISE,
            StatusOS.AGUARDANDO_PECA, StatusOS.CANCELADA
        ],
        StatusOS.APROVADO: [
            StatusOS.PRONTO, StatusOS.AGUARDANDO_PECA,
            StatusOS.AGUARDANDO_REAVALIACAO, StatusOS.CANCELADA
        ],
        # A peça foi pedida ao ADM: quando chegar, o técnico retoma o reparo
        # ou devolve o orçamento ao balcão.
        StatusOS.AGUARDANDO_PECA: [
            StatusOS.APROVADO, StatusOS.AGUARDANDO_ANALISE, StatusOS.AGUARDANDO_CLIENTE,
            StatusOS.AGUARDANDO_REAVALIACAO, StatusOS.CANCELADA
        ],
        StatusOS.RECUSADO: [
            StatusOS.ENTREGUE, StatusOS.AGUARDANDO_CLIENTE, StatusOS.CANCELADA
        ],
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

        permitidos = OSService.FLUXO_VALIDO.get(atual, [])
        if novo not in permitidos:
            destinos = ", ".join(s.value for s in permitidos) or "nenhum (estado final)"
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Transição proibida: Não é possível mudar de '{status_atual}' para "
                    f"'{novo_status}'. A partir de '{status_atual}' só é possível ir para: {destinos}."
                )
            )

    @staticmethod
    def calcular_mao_de_obra(os_db: models.OrdemServico) -> float:
        """Base da comissão do técnico: o que sobra do orçamento depois das
        peças. Comissionar sobre o valor da peça pagaria o técnico pelo custo
        de compra da loja."""
        total_pecas = sum(
            float(item.preco_unitario or 0) * (item.quantidade or 0)
            for item in os_db.itens
        )
        return max(0.0, float(os_db.valor_orcamento or 0) - total_pecas)

    @staticmethod
    def atualizar_status(db: Session, os_db: models.OrdemServico, novo_status: str, user_id: int):

        OSService.validar_transicao(os_db.status, novo_status)


        agora = datetime.now(timezone.utc)

        if novo_status == StatusOS.APROVADO.value:
            os_db.data_inicio_reparo = agora

        if novo_status == StatusOS.PRONTO.value:
            os_db.data_fim_reparo = agora

            inicio = os_db.data_inicio_reparo
            if inicio:
                # O SQLite devolve datetimes ingénuos; assume-se UTC para não
                # rebentar a subtração com o 'agora' com fuso.
                if inicio.tzinfo is None:
                    inicio = inicio.replace(tzinfo=timezone.utc)
                os_db.horas_tecnicas = round((agora - inicio).total_seconds() / 3600, 2)

        # Estes campos nunca eram escritos: valor_mao_de_obra ficava a 0 e a
        # comissão do técnico dava sempre R$ 0,00, e data_conclusao NULL
        # mantinha o KPI de tempo médio de reparo em 0.0.
        if novo_status in (StatusOS.PRONTO.value, StatusOS.ENTREGUE.value):
            os_db.valor_mao_de_obra = OSService.calcular_mao_de_obra(os_db)

        if novo_status == StatusOS.ENTREGUE.value:
            os_db.data_conclusao = agora

        os_db.status = novo_status
        return os_db