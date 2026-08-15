from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta, timezone
import time 

from core.database import get_db
from core.deps import admin_required
from models import models
from services.os_service import StatusOS

router = APIRouter(prefix="/dashboard", tags=["Dashboard e Inteligência"])


CACHE_DADOS = {}
TEMPO_EXPIRACAO_SEGUNDOS = 300 

@router.get("/metricas")
def obter_metricas_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    chave_cache = f"metricas_loja_{admin.loja_id}"
    
    
    if chave_cache in CACHE_DADOS:
        if time.time() - CACHE_DADOS[chave_cache]['tempo'] < TEMPO_EXPIRACAO_SEGUNDOS:
            return CACHE_DADOS[chave_cache]['dados']

    
    # O livro financeiro é a fonte de verdade: separa serviço de produto e já
    # desconta o que foi concedido. Somar Venda.valor_total com o orçamento das
    # OS entregues contava o serviço duas vezes, porque a venda da OS já inclui
    # o valor do orçamento no seu total.
    def soma_entradas(categoria):
        return float(db.query(func.sum(models.TransacaoFinanceira.valor)).filter(
            models.TransacaoFinanceira.loja_id == admin.loja_id,
            models.TransacaoFinanceira.tipo == "ENTRADA",
            models.TransacaoFinanceira.categoria == categoria
        ).scalar() or 0)

    total_servicos_os = soma_entradas("Serviços (OS)")
    total_vendas_balcao = soma_entradas("Venda de Produtos")
    total_descontos = float(db.query(func.sum(models.TransacaoFinanceira.valor)).filter(
        models.TransacaoFinanceira.loja_id == admin.loja_id,
        models.TransacaoFinanceira.tipo == "SAIDA",
        models.TransacaoFinanceira.categoria == "Descontos Concedidos"
    ).scalar() or 0)

    resultado = {
        "faturamento_total": total_servicos_os + total_vendas_balcao - total_descontos,
        # A tela de Financeiro lia estes dois campos, que a API nunca devolveu:
        # Number(undefined) dava "R$ NaN".
        "total_servicos_os": total_servicos_os,
        "total_vendas_balcao": total_vendas_balcao,
        "os_pendentes": db.query(func.count(models.OrdemServico.id)).filter(models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.status.notin_([StatusOS.ENTREGUE.value, StatusOS.CANCELADA.value])).scalar()
    }

   
    CACHE_DADOS[chave_cache] = {'dados': resultado, 'tempo': time.time()}
    return resultado

@router.get("/graficos")
def obter_graficos_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    chave_cache = f"graficos_loja_{admin.loja_id}"
    
  
    if chave_cache in CACHE_DADOS:
        if time.time() - CACHE_DADOS[chave_cache]['tempo'] < TEMPO_EXPIRACAO_SEGUNDOS:
            return CACHE_DADOS[chave_cache]['dados']

    hoje = datetime.now(timezone.utc)
    seis_meses_atras = hoje - timedelta(days=180)

    
    vendas_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.Venda.valor_total).label('receita'),
        func.count(models.Venda.id).label('qtd_vendas')
    ).filter(
        models.Venda.loja_id == admin.loja_id, models.Venda.data_venda >= seis_meses_atras
    ).group_by(func.to_char(models.Venda.data_venda, 'MM/YYYY')).order_by(func.min(models.Venda.data_venda)).all()

    custos_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.ItemVenda.quantidade * getattr(models.Produto, 'preco_custo', 0)).label('custo_total')
    ).select_from(models.Venda).join(models.ItemVenda, models.ItemVenda.venda_id == models.Venda.id).join(models.Produto, models.ItemVenda.produto_id == models.Produto.id).filter(
        models.Venda.loja_id == admin.loja_id, models.Venda.data_venda >= seis_meses_atras
    ).group_by(func.to_char(models.Venda.data_venda, 'MM/YYYY')).all()

    mapa_custos = {c.mes: float(c.custo_total or 0) for c in custos_mensais}

    dados_financeiros = []
    total_receita = 0; total_vendas = 0

    for v in vendas_mensais:
        mes = v.mes; receita = float(v.receita or 0)
        custo = mapa_custos.get(mes, 0.0); lucro_real = receita - custo 
        ticket_medio = receita / v.qtd_vendas if v.qtd_vendas > 0 else 0
        total_receita += receita; total_vendas += v.qtd_vendas

        dados_financeiros.append({"name": mes, "Receita": receita, "Custo": custo, "Lucro": lucro_real, "TicketMedio": ticket_medio})

    ticket_medio_geral = total_receita / total_vendas if total_vendas > 0 else 0

    
    categorias = db.query(
        models.Produto.categoria, func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('valor')
    ).join(models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id).join(models.Venda, models.ItemVenda.venda_id == models.Venda.id).filter(
        models.Venda.loja_id == admin.loja_id, models.Venda.data_venda >= seis_meses_atras
    ).group_by(models.Produto.categoria).all()
    dados_categorias = [{"name": c.categoria or "Outros", "value": float(c.valor or 0)} for c in categorias]

    
    ranking = db.query(
        models.Produto.nome, func.sum(models.ItemVenda.quantidade).label('qtd'), func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('receita')
    ).join(models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id).join(models.Venda, models.ItemVenda.venda_id == models.Venda.id).filter(
        models.Venda.loja_id == admin.loja_id
    ).group_by(models.Produto.id).order_by(desc('qtd')).limit(5).all()
    dados_ranking = [{"nome": r.nome, "qtd": int(r.qtd), "receita": float(r.receita or 0)} for r in ranking]

   
    media_segundos = db.query(func.avg(func.extract('epoch', models.OrdemServico.data_conclusao - models.OrdemServico.data_entrada))).filter(
        models.OrdemServico.loja_id == admin.loja_id, models.OrdemServico.data_entrada.isnot(None), models.OrdemServico.data_conclusao.isnot(None), models.OrdemServico.status == StatusOS.ENTREGUE.value 
    ).scalar()

    resultado_final = {
        "financeiro": dados_financeiros,
        "categorias": dados_categorias if dados_categorias else [{"name": "Sem dados", "value": 1}],
        "ranking_produtos": dados_ranking,
        "kpis_extras": {"ticket_medio_geral": round(ticket_medio_geral, 2), "tempo_medio_reparo_horas": round(media_segundos / 3600, 1) if media_segundos else 0.0}
    }

    
    CACHE_DADOS[chave_cache] = {'dados': resultado_final, 'tempo': time.time()}
    return resultado_final


@router.post("/limpar-cache")
def limpar_cache(admin=Depends(admin_required)):
    chave_metricas = f"metricas_loja_{admin.loja_id}"
    chave_graficos = f"graficos_loja_{admin.loja_id}"
    if chave_metricas in CACHE_DADOS: del CACHE_DADOS[chave_metricas]
    if chave_graficos in CACHE_DADOS: del CACHE_DADOS[chave_graficos]
    return {"mensagem": "Cache limpo. Os próximos dados serão calculados em tempo real."}