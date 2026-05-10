from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List
import os
import jwt
from datetime import datetime, timedelta, timezone
from enum import Enum
from collections import defaultdict

# IMPORTS DO SISTEMA
from core.database import engine, get_db
from core import security
from models import models
from schemas import schemas

# ==============================
# CONFIG INICIAL E SEGURANÇA
# ==============================
print("Iniciando construção do banco de dados...")
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechLab API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Origem exata do React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = getattr(security, "SECRET_KEY", "techlab_secreto_123")
ALGORITHM = getattr(security, "ALGORITHM", "HS256")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class StatusOS(str, Enum):
    AGUARDANDO_ANALISE = "Aguardando Análise"
    AGUARDANDO_CLIENTE = "Aguardando Cliente"
    AGUARDANDO_REAVALIACAO = "Aguardando Reavaliação"
    AGUARDANDO_PECA = "Aguardando Peça"
    APROVADO = "APROVADO - Fila de Conserto"
    PRONTO = "Pronto para Retirada"
    ENTREGUE = "Entregue"
    CANCELADA = "Cancelada"

# ==============================
# DEPENDÊNCIAS DE AUTENTICAÇÃO E PERMISSÕES
# ==============================
def obter_usuario_logado(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if not usuario or usuario.ativo is False:
        raise HTTPException(status_code=401, detail="Usuário inválido ou inativo")

    return usuario

def admin_required(user: models.Usuario = Depends(obter_usuario_logado)):
    if user.cargo.lower() not in ["admin", "adm", "administrador"]:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de Administrador")
    return user


# ==============================
# LOGIN
# ==============================
@app.post("/token", response_model=schemas.Token)
def login_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not usuario or not security.verify_password(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "access_token": security.create_access_token(data=token_data),
        "token_type": "bearer"
    }

@app.post("/login")
def login_json(credenciais: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == credenciais.email).first()
    if not usuario or not security.verify_password(credenciais.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token_data = {"sub": usuario.email, "cargo": usuario.cargo, "nome": usuario.nome}
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "cargo": usuario.cargo,
        "email": usuario.email,
        "access_token": security.create_access_token(data=token_data),
        "token_type": "bearer"
    }

# ==============================
# USUÁRIOS & MÉTRICAS
# ==============================
@app.post("/usuarios", response_model=schemas.UsuarioResponse)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    if db.query(models.Usuario).filter(models.Usuario.email == usuario.email).first():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    novo = models.Usuario(
        nome=usuario.nome, email=usuario.email,
        senha_hash=security.get_password_hash(usuario.senha),
        cargo=usuario.cargo, loja_id=admin.loja_id, ativo=True
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@app.delete("/usuarios/{id}")
def deletar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    db_user = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db_user.ativo = False
    db.commit()
    return {"mensagem": "Acesso revogado"}

@app.put("/usuarios/{id}/reativar")
def reativar_usuario(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
        
    usuario.ativo = True
    db.commit()
    return {"mensagem": f"Acesso de {usuario.nome} reativado"}

@app.get("/usuarios")
def listar_usuarios_com_metricas(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    usuarios = db.query(models.Usuario).filter(models.Usuario.loja_id == user.loja_id).offset(skip).limit(limit).all()
    user_ids = [u.id for u in usuarios]
    
    if not user_ids:
        return []

    # Busca as vendas e serviços
    vendas_bulk = db.query(
        models.Venda.usuario_id,
        func.count(models.Venda.id).label('qtd_vendas'),
        func.sum(models.Venda.valor_total).label('soma_vendas')
    ).filter(models.Venda.usuario_id.in_(user_ids)).group_by(models.Venda.usuario_id).all()
    vendas_map = {row.usuario_id: {'qtd': row.qtd_vendas, 'soma': row.soma_vendas or 0} for row in vendas_bulk}

    os_balcao_bulk = db.query(
        models.OrdemServico.atendente_id,
        func.count(models.OrdemServico.id).label('qtd_os')
    ).filter(models.OrdemServico.atendente_id.in_(user_ids)).group_by(models.OrdemServico.atendente_id).all()
    os_balcao_map = {row.atendente_id: row.qtd_os for row in os_balcao_bulk}

    os_tec_bulk = db.query(
        models.OrdemServico.tecnico_id,
        func.count(models.OrdemServico.id).label('qtd_reparos'),
        func.sum(models.OrdemServico.horas_tecnicas).label('soma_horas'),
        func.sum(models.OrdemServico.valor_mao_de_obra).label('soma_mao_obra')
    ).filter(
        models.OrdemServico.tecnico_id.in_(user_ids),
        models.OrdemServico.status == StatusOS.PRONTO.value
    ).group_by(models.OrdemServico.tecnico_id).all()
    os_tec_map = {row.tecnico_id: {'qtd': row.qtd_reparos, 'horas': row.soma_horas or 0, 'mao_obra': row.soma_mao_obra or 0} for row in os_tec_bulk}

    resultado = []
    for u in usuarios:
        taxa = float(u.taxa_comissao or 0) / 100.0

        user_dict = {
            "id": u.id, "nome": u.nome, "email": u.email, 
            "cargo": u.cargo, "ativo": u.ativo, 
            "taxa_comissao": float(u.taxa_comissao or 0) 
        }
        
        if u.cargo == "balcao":
            user_dict["clientes_atendidos"] = os_balcao_map.get(u.id, 0)
            v_data = vendas_map.get(u.id, {'qtd': 0, 'soma': 0})
            user_dict["vendas_realizadas"] = v_data['qtd']
            user_dict["comissao_vendas"] = float(v_data['soma']) * taxa

        elif u.cargo == "tecnico":
            t_data = os_tec_map.get(u.id, {'qtd': 0, 'horas': 0, 'mao_obra': 0})
            user_dict["reparos_concluidos"] = t_data['qtd']
            user_dict["horas_tecnicas"] = float(t_data['horas'])
            user_dict["comissao_reparos"] = float(t_data['mao_obra']) * taxa
            
        resultado.append(user_dict)
        
    return resultado

from pydantic import BaseModel
class ComissaoUpdate(BaseModel):
    taxa_comissao: float

@app.put("/usuarios/{id}/comissao")
def atualizar_comissao(id: int, payload: ComissaoUpdate, db: Session = Depends(get_db), admin=Depends(admin_required)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == id, models.Usuario.loja_id == admin.loja_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    usuario.taxa_comissao = payload.taxa_comissao
    db.commit()
    return {"mensagem": "Comissão atualizada com sucesso!", "nova_taxa": usuario.taxa_comissao}

# ==============================
# CLIENTES
# ==============================
@app.post("/clientes", response_model=schemas.ClienteResponse)
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados_cliente = cliente.model_dump() if hasattr(cliente, 'model_dump') else cliente.dict()
    novo = models.Cliente(**dados_cliente, loja_id=user.loja_id)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


# ==============================
# ORDENS DE SERVIÇO (BLINDADO ERP)
# ==============================
@app.get("/ordens-servico")
def listar_os(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(obter_usuario_logado)
):
    # N+1 Resolvido: Traz OS, Cliente e Itens de uma vez
    resultados = db.query(models.OrdemServico).options(
        joinedload(models.OrdemServico.itens).joinedload(models.ItemOS.produto),
        joinedload(models.OrdemServico.cliente)
    ).filter(
        models.OrdemServico.loja_id == user.loja_id,
        models.OrdemServico.ativo == True
    ).order_by(desc(models.OrdemServico.id)).offset(skip).limit(limit).all()

    ordens_formatadas = []
    for os_obj in resultados:
        os_dict = {c.name: getattr(os_obj, c.name) for c in os_obj.__table__.columns}

        os_dict["cliente_nome"] = os_obj.cliente.nome if os_obj.cliente else "Sem Cliente"
        os_dict["telefone"] = os_obj.cliente.telefone if os_obj.cliente else ""

        os_dict["itens"] = [
            {
                "id": item.id,
                "nome_produto": item.nome_produto or (item.produto.nome if item.produto else "Item sem nome"),
                "quantidade": int(item.quantidade),
                "preco_unitario": float(item.preco_unitario),
                "total": float(item.quantidade * item.preco_unitario)
            }
            for item in os_obj.itens
        ]
        ordens_formatadas.append(os_dict)

    return ordens_formatadas


@app.post("/ordens-servico", response_model=schemas.OSResponse)
def criar_os(os_data: schemas.OSCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        dados = os_data.model_dump() if hasattr(os_data, 'model_dump') else os_data.dict()
        colunas_reais = [c.name for c in models.OrdemServico.__table__.columns]
        dados_limpos = {k: v for k, v in dados.items() if k in colunas_reais}

        nova = models.OrdemServico(
            **dados_limpos, 
            status=StatusOS.AGUARDANDO_ANALISE.value, 
            loja_id=user.loja_id, 
            usuario_id=user.id, 
            ativo=True
        )
        if "atendente_id" in colunas_reais:
            nova.atendente_id = user.id

        db.add(nova)
        db.commit()
        db.refresh(nova)
        
        os_dict = {c.name: getattr(nova, c.name) for c in nova.__table__.columns}
        cliente = db.query(models.Cliente).filter(models.Cliente.id == nova.cliente_id).first()
        os_dict["cliente_nome"] = cliente.nome if cliente else "Sem Cliente"
        os_dict["itens"] = []
        
        return schemas.OSResponse(**os_dict)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/ordens-servico/{os_id}", response_model=schemas.OSResponse)
def atualizar_os(os_id: int, payload: schemas.OSUpdate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_db = db.query(models.OrdemServico).filter(
            models.OrdemServico.id == os_id, 
            models.OrdemServico.loja_id == user.loja_id,
            models.OrdemServico.ativo == True
        ).with_for_update().first()
        
        if not os_db:
            raise HTTPException(status_code=404, detail="OS não encontrada")
        
        dados = payload.model_dump(exclude_unset=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_unset=True)
        
        if "pecas_selecionadas" in dados:
            pecas_front = dados.pop("pecas_selecionadas")

            # 1. DEVOLVE AS RESERVAS ANTIGAS
            itens_antigos = db.query(models.ItemOS).filter(models.ItemOS.os_id == os_id).all()
            for item in itens_antigos:
                produto_antigo = db.query(models.Produto).filter(models.Produto.id == item.produto_id).with_for_update().first()
                if produto_antigo:
                    produto_antigo.estoque_reservado -= item.quantidade
                    if produto_antigo.estoque_reservado < 0: produto_antigo.estoque_reservado = 0
                    
                    db.add(models.MovimentacaoEstoque(
                        produto_id=produto_antigo.id, usuario_id=user.id, tipo="ESTORNO_RESERVA", 
                        quantidade=item.quantidade, observacao=f"Orçamento alterado/cancelado OS #{os_id}"
                    ))
                db.delete(item)

            db.flush()

            # 2. AGRUPA E CRIA NOVAS RESERVAS
            pecas_agrupadas = defaultdict(lambda: {"qtd": 0, "preco": 0.0})
            for peca in pecas_front:
                pid = peca.get("produto_id")
                pecas_agrupadas[pid]["qtd"] += int(peca.get("qtd", 1))
                pecas_agrupadas[pid]["preco"] = float(peca.get("preco", 0))

            for produto_id, info in pecas_agrupadas.items():
                quantidade = info["qtd"]

                produto = db.query(models.Produto).filter(
                    models.Produto.id == produto_id,
                    models.Produto.loja_id == user.loja_id,
                    models.Produto.ativo == True
                ).with_for_update().first()

                if not produto: continue

                estoque_disponivel = produto.estoque_atual - (produto.estoque_reservado or 0)
                if estoque_disponivel < quantidade:
                    raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {produto.nome}. Livre: {estoque_disponivel}")

                produto.estoque_reservado = (produto.estoque_reservado or 0) + quantidade

                novo_item = models.ItemOS(
                    os_id=os_id, produto_id=produto.id, nome_produto=produto.nome, 
                    quantidade=quantidade, preco_unitario=info["preco"]
                )
                db.add(novo_item)

                db.add(models.MovimentacaoEstoque(
                    produto_id=produto.id, usuario_id=user.id, tipo="RESERVA", 
                    quantidade=quantidade, observacao=f"Reserva para OS #{os_id}"
                ))

        # Assinatura do Técnico (Carimba quando manda pro Balcão)
        if "status" in dados:
            if str(dados["status"]) == StatusOS.AGUARDANDO_CLIENTE.value and not os_db.tecnico_id:
                os_db.tecnico_id = user.id

        campos_permitidos = {"status", "valor_orcamento", "observacoes_balcao", "laudo_tecnico", "pecas_necessarias", "data_inicio_reparo", "data_fim_reparo"}
        for key, value in dados.items():
            if key in campos_permitidos:
                if key == "valor_orcamento" and value is not None: value = float(value)
                setattr(os_db, key, value)

        db.commit()
        db.refresh(os_db)

        os_atualizada = db.query(models.OrdemServico).options(joinedload(models.OrdemServico.itens)).filter(models.OrdemServico.id == os_id).first()
        os_dict = {c.name: getattr(os_atualizada, c.name) for c in os_atualizada.__table__.columns}
        os_dict["itens"] = [{"id": i.id, "nome_produto": i.nome_produto, "quantidade": i.quantidade, "preco_unitario": float(i.preco_unitario)} for i in os_atualizada.itens]
        os_dict["cliente_nome"] = os_atualizada.cliente.nome if os_atualizada.cliente else "Sem Cliente"
        
        return os_dict

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/ordens-servico/{id}")
def deletar_os(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    try:
        os_db = db.query(models.OrdemServico).filter(
            models.OrdemServico.id == id,
            models.OrdemServico.loja_id == admin.loja_id
        ).with_for_update().first()
        
        if not os_db:
            raise HTTPException(status_code=404, detail="OS não encontrada")
        
        # Devolver estoque antes de inativar/apagar
        itens_reservados = db.query(models.ItemOS).filter(models.ItemOS.os_id == os_db.id).all()
        for item in itens_reservados:
            produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id).with_for_update().first()
            if produto:
                produto.estoque_reservado -= item.quantidade
                if produto.estoque_reservado < 0: produto.estoque_reservado = 0
                
                db.add(models.MovimentacaoEstoque(
                    produto_id=produto.id, usuario_id=admin.id, tipo="ESTORNO_CANCELAMENTO", 
                    quantidade=item.quantidade, observacao=f"OS #{id} foi cancelada/excluída"
                ))
            
            if os_db.status in [StatusOS.AGUARDANDO_ANALISE.value, StatusOS.AGUARDANDO_CLIENTE.value]:
                db.delete(item)

        if os_db.status in [StatusOS.AGUARDANDO_ANALISE.value, StatusOS.AGUARDANDO_CLIENTE.value]:
            db.delete(os_db) 
        else:
            os_db.status = StatusOS.CANCELADA.value
            os_db.ativo = False 
            
        db.commit()
        return {"mensagem": "OS excluída ou cancelada com sucesso, reservas estornadas."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ordens-servico/{os_id}/itens", response_model=schemas.ItemOSResponse)
def adicionar_peca_os(os_id: int, item_in: schemas.ItemOSCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        os_db = db.query(models.OrdemServico).filter(
            models.OrdemServico.id == os_id, 
            models.OrdemServico.loja_id == user.loja_id,
            models.OrdemServico.ativo == True
        ).first()
        
        produto = db.query(models.Produto).filter(
            models.Produto.id == item_in.produto_id, 
            models.Produto.loja_id == user.loja_id,
            models.Produto.ativo == True
        ).with_for_update().first()
        
        if not os_db: raise HTTPException(status_code=404, detail="OS não encontrada")
        if not produto: raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        estoque_disponivel = produto.estoque_atual - (produto.estoque_reservado or 0)
        if estoque_disponivel < item_in.quantidade:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente. Temos apenas {estoque_disponivel} livres.")

        produto.estoque_reservado = (produto.estoque_reservado or 0) + item_in.quantidade
        
        db.add(models.MovimentacaoEstoque(
            produto_id=produto.id, usuario_id=user.id, tipo="RESERVA_AVULSA", 
            quantidade=item_in.quantidade, observacao=f"Adição manual em OS #{os_id}"
        ))

        novo_item = models.ItemOS(
            os_id=os_id, produto_id=produto.id, nome_produto=produto.nome,
            quantidade=item_in.quantidade, preco_unitario=produto.preco_venda
        )
        
        valor_adicional = float(produto.preco_venda) * item_in.quantidade
        os_db.valor_orcamento = float(os_db.valor_orcamento or 0) + valor_adicional
        
        db.add(novo_item)
        db.commit()
        db.refresh(novo_item)
        
        return novo_item

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==============================
# PRODUTOS
# ==============================
@app.get("/produtos", response_model=List[schemas.ProdutoResponse])
def listar_produtos(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.Produto).filter(
        models.Produto.loja_id == user.loja_id,
        models.Produto.ativo == True 
    ).offset(skip).limit(limit).all()

@app.post("/produtos", response_model=schemas.ProdutoResponse)
def criar_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados = produto.model_dump() if hasattr(produto, 'model_dump') else produto.dict()
    colunas_reais = [c.name for c in models.Produto.__table__.columns]
    dados_limpos = {k: v for k, v in dados.items() if k in colunas_reais}
    dados_limpos['loja_id'] = user.loja_id
    
    novo_produto = models.Produto(**dados_limpos)
    db.add(novo_produto)
    db.commit()
    db.refresh(novo_produto)
    return novo_produto

@app.delete("/produtos/{id}")
def deletar_produto(id: int, db: Session = Depends(get_db), admin=Depends(admin_required)):
    produto = db.query(models.Produto).filter(models.Produto.id == id, models.Produto.loja_id == admin.loja_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    produto.ativo = False 
    db.commit()
    return {"mensagem": "Produto removido do estoque"}

@app.put("/produtos/{id}", response_model=schemas.ProdutoResponse)
def atualizar_produto(id: int, payload: schemas.ProdutoCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    produto_db = db.query(models.Produto).filter(
        models.Produto.id == id, 
        models.Produto.loja_id == user.loja_id,
        models.Produto.ativo == True
    ).first()
    
    if not produto_db:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Transforma o payload em dicionário
    dados = payload.model_dump(exclude_unset=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_unset=True)
    colunas_reais = [c.name for c in models.Produto.__table__.columns]
    
    # Atualiza apenas as colunas que realmente existem na tabela
    for key, value in dados.items():
        if key in colunas_reais:
            setattr(produto_db, key, value)
            
    db.commit()
    db.refresh(produto_db)
    
    return produto_db

# ==============================
# VENDAS / PDV (EFETIVAÇÃO FINAL DO ESTOQUE E SPLIT)
# ==============================
@app.post("/vendas")
def finalizar_venda(venda: schemas.VendaCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    try:
        valor_total = 0.0

        # Se a venda vier com um ID de Ordem de Serviço
        os_vinculada = None
        if hasattr(venda, 'os_id') and venda.os_id:
            os_vinculada = db.query(models.OrdemServico).filter(
                models.OrdemServico.id == venda.os_id,
                models.OrdemServico.loja_id == user.loja_id
            ).with_for_update().first()
            if os_vinculada:
                valor_total += float(os_vinculada.valor_orcamento or 0)
                
                # EFETIVAÇÃO DO ESTOQUE
                for item_os in os_vinculada.itens:
                    prod = db.query(models.Produto).filter(models.Produto.id == item_os.produto_id).first()
                    if prod:
                        prod.estoque_reservado -= item_os.quantidade
                        if prod.estoque_reservado < 0: prod.estoque_reservado = 0
                        prod.estoque_atual -= item_os.quantidade
                        
                        db.add(models.MovimentacaoEstoque(
                            produto_id=prod.id, usuario_id=user.id, tipo="BAIXA_VENDA_OS", 
                            quantidade=item_os.quantidade, observacao=f"Baixa física OS #{os_vinculada.id}"
                        ))

        nova_venda = models.Venda(
            valor_total=0,
            forma_pagamento=venda.forma_pagamento,
            loja_id=user.loja_id,
            usuario_id=user.id,
            os_id=venda.os_id if hasattr(venda, 'os_id') else None
        )

        db.add(nova_venda)
        db.flush()

        for item in venda.itens:
            produto = db.query(models.Produto).filter(
                models.Produto.id == item.produto_id,
                models.Produto.loja_id == user.loja_id
            ).with_for_update().first()

            if not produto:
                raise HTTPException(404, f"Produto {item.produto_id} não encontrado")

            estoque_disponivel = produto.estoque_atual - (produto.estoque_reservado or 0)
            if estoque_disponivel < item.quantidade:
                raise HTTPException(400, f"Estoque insuficiente para {produto.nome}")

            produto.estoque_atual -= item.quantidade
            valor_total += float(produto.preco_venda) * item.quantidade

            db.add(models.ItemVenda(
                venda_id=nova_venda.id, produto_id=produto.id,
                quantidade=item.quantidade, preco_unitario=produto.preco_venda
            ))
            
            db.add(models.MovimentacaoEstoque(
                produto_id=produto.id, usuario_id=user.id, tipo="BAIXA_VENDA_DIRETA", 
                quantidade=item.quantidade, observacao=f"Venda Balcão #{nova_venda.id}"
            ))

        nova_venda.valor_total = valor_total
        
        if os_vinculada:
            os_vinculada.status = StatusOS.ENTREGUE.value
            os_vinculada.data_conclusao = datetime.now(timezone.utc)

        db.commit()
        return {"mensagem": "Venda concluída com sucesso", "venda_id": nova_venda.id}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Erro Crítico na Venda: {str(e)}")
        raise HTTPException(500, detail="Erro interno no processamento do checkout")

# ==============================
# SOLICITAÇÕES
# ==============================
@app.post("/solicitacoes", response_model=schemas.SolicitacaoCompraResponse)
def criar_solicitacao(solicitacao: schemas.SolicitacaoCompraCreate, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    dados = solicitacao.model_dump() if hasattr(solicitacao, 'model_dump') else solicitacao.dict()
    dados["loja_id"] = user.loja_id 
    
    nova = models.SolicitacaoCompra(**dados)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova

@app.get("/solicitacoes", response_model=List[schemas.SolicitacaoCompraResponse])
def listar_solicitacoes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    return db.query(models.SolicitacaoCompra).filter(models.SolicitacaoCompra.loja_id == user.loja_id).order_by(models.SolicitacaoCompra.id.desc()).offset(skip).limit(limit).all()

@app.put("/solicitacoes/{id}/status")
def mudar_status(id: int, status_novo: str, db: Session = Depends(get_db), user=Depends(admin_required)):
    solicitacao = db.query(models.SolicitacaoCompra).filter(
        models.SolicitacaoCompra.id == id,
        models.SolicitacaoCompra.loja_id == user.loja_id
    ).first()
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    solicitacao.status = status_novo
    db.commit()
    return {"mensagem": f"Status alterado para {status_novo}"}

# ==============================
# MINI-CRM: RESUMO DO CLIENTE
# ==============================
@app.get("/clientes/{cliente_id}/resumo")
def resumo_cliente(cliente_id: int, db: Session = Depends(get_db), user=Depends(obter_usuario_logado)):
    cliente = db.query(models.Cliente).filter(
        models.Cliente.id == cliente_id, 
        models.Cliente.loja_id == user.loja_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    historico_os = db.query(models.OrdemServico).filter(
        models.OrdemServico.cliente_id == cliente_id
    ).order_by(models.OrdemServico.data_entrada.desc()).all()
    
    historico_vendas = db.query(models.Venda).filter(
        models.Venda.cliente_id == cliente_id
    ).order_by(models.Venda.id.desc()).all()
    
    total_gasto_servicos = sum([float(os.valor_orcamento or 0) for os in historico_os if os.status == StatusOS.ENTREGUE.value])
    total_gasto_produtos = sum([float(v.valor_total or 0) for v in historico_vendas])
    
    return {
        "cliente": {
            "nome": cliente.nome,
            "telefone": cliente.telefone,
            "email": cliente.email,
            "desde": cliente.data_cadastro
        },
        "metricas": {
            "total_os": len(historico_os),
            "total_compras": len(historico_vendas),
            "investimento_total": total_gasto_servicos + total_gasto_produtos
        },
        "aparelhos_frequentes": list(set([f"{os.marca} {os.modelo}" for os in historico_os])),
        "ultimas_os": historico_os[:5], 
        "ultimas_vendas": historico_vendas[:5] 
    }

# ==============================
# DASHBOARD / FINANCEIRO (ADM)
# ==============================
@app.get("/dashboard/metricas")
def obter_metricas_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    total_vendas = db.query(func.sum(models.Venda.valor_total)).filter(
        models.Venda.loja_id == admin.loja_id
    ).scalar() or 0

    total_os = db.query(func.sum(models.OrdemServico.valor_orcamento)).filter(
        models.OrdemServico.loja_id == admin.loja_id,
        models.OrdemServico.status == StatusOS.ENTREGUE.value
    ).scalar() or 0

    os_pendentes = db.query(func.count(models.OrdemServico.id)).filter(
        models.OrdemServico.loja_id == admin.loja_id,
        models.OrdemServico.status.notin_([StatusOS.ENTREGUE.value, StatusOS.CANCELADA.value])
    ).scalar() or 0

    baixo_estoque = db.query(func.count(models.Produto.id)).filter(
        models.Produto.loja_id == admin.loja_id,
        models.Produto.estoque_atual <= models.Produto.estoque_minimo,
        models.Produto.ativo == True
    ).scalar() or 0

    return {
        "faturamento_total": float(total_vendas) + float(total_os),
        "total_vendas_balcao": float(total_vendas),
        "total_servicos_os": float(total_os),
        "os_pendentes": os_pendentes,
        "alertas_estoque": baixo_estoque
    }

# ==============================
# DASHBOARD ERP / INTELIGÊNCIA DE NEGÓCIO
# ==============================
@app.get("/dashboard/graficos")
def obter_graficos_dashboard(db: Session = Depends(get_db), admin=Depends(admin_required)):
    hoje = datetime.now(timezone.utc)
    seis_meses_atras = hoje - timedelta(days=180)

    vendas_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.Venda.valor_total).label('receita'),
        func.count(models.Venda.id).label('qtd_vendas')
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        func.to_char(models.Venda.data_venda, 'MM/YYYY')
    ).order_by(
        func.min(models.Venda.data_venda) 
    ).all()

    custos_mensais = db.query(
        func.to_char(models.Venda.data_venda, 'MM/YYYY').label('mes'),
        func.sum(models.ItemVenda.quantidade * getattr(models.Produto, 'preco_custo', 0)).label('custo_total')
    ).select_from(models.Venda).join(
        models.ItemVenda, models.ItemVenda.venda_id == models.Venda.id
    ).join(
        models.Produto, models.ItemVenda.produto_id == models.Produto.id
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        func.to_char(models.Venda.data_venda, 'MM/YYYY')
    ).all()

    mapa_custos = {c.mes: float(c.custo_total or 0) for c in custos_mensais}

    dados_financeiros = []
    total_receita = 0
    total_vendas = 0

    for v in vendas_mensais:
        mes = v.mes
        receita = float(v.receita or 0)
        custo = mapa_custos.get(mes, 0.0)
        lucro_real = receita - custo 
        
        ticket_medio = receita / v.qtd_vendas if v.qtd_vendas > 0 else 0
        total_receita += receita
        total_vendas += v.qtd_vendas

        dados_financeiros.append({
            "name": mes,
            "Receita": receita,
            "Custo": custo,
            "Lucro": lucro_real,
            "TicketMedio": ticket_medio
        })

    ticket_medio_geral = total_receita / total_vendas if total_vendas > 0 else 0

    categorias = db.query(
        models.Produto.categoria,
        func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('valor')
    ).join(
        models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id
    ).join(
        models.Venda, models.ItemVenda.venda_id == models.Venda.id
    ).filter(
        models.Venda.loja_id == admin.loja_id,
        models.Venda.data_venda >= seis_meses_atras
    ).group_by(
        models.Produto.categoria
    ).all()

    dados_categorias = [{"name": c.categoria or "Outros", "value": float(c.valor or 0)} for c in categorias]

    ranking = db.query(
        models.Produto.nome,
        func.sum(models.ItemVenda.quantidade).label('qtd'),
        func.sum(models.ItemVenda.quantidade * models.ItemVenda.preco_unitario).label('receita')
    ).join(
        models.ItemVenda, models.ItemVenda.produto_id == models.Produto.id
    ).join(
        models.Venda, models.ItemVenda.venda_id == models.Venda.id
    ).filter(
        models.Venda.loja_id == admin.loja_id
    ).group_by(
        models.Produto.id
    ).order_by(
        desc('qtd')
    ).limit(5).all()

    dados_ranking = [{"nome": r.nome, "qtd": int(r.qtd), "receita": float(r.receita or 0)} for r in ranking]

    media_segundos = db.query(
        func.avg(func.extract('epoch', models.OrdemServico.data_conclusao - models.OrdemServico.data_entrada))
    ).filter(
        models.OrdemServico.loja_id == admin.loja_id,
        models.OrdemServico.data_entrada.isnot(None),
        models.OrdemServico.data_conclusao.isnot(None),
        models.OrdemServico.status == StatusOS.ENTREGUE.value 
    ).scalar()

    tempo_medio_horas = round(media_segundos / 3600, 1) if media_segundos else 0.0

    return {
        "financeiro": dados_financeiros,
        "categorias": dados_categorias if dados_categorias else [{"name": "Sem dados", "value": 1}],
        "ranking_produtos": dados_ranking,
        "kpis_extras": {
            "ticket_medio_geral": round(ticket_medio_geral, 2),
            "tempo_medio_reparo_horas": tempo_medio_horas
        }
    }