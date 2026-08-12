"""criar_schema_completo_se_ausente

As migrations anteriores só continham ALTER/CREATE INDEX: o schema original
foi criado uma vez via Base.metadata.create_all() fora do controle de
versão, então rodar `alembic upgrade head` num banco vazio não recriava as
tabelas. Esta migration cria (de forma idempotente, tabela a tabela) todo o
schema atual definido em app/models/models.py, para que um banco novo fique
pronto só com `alembic upgrade head`. Em bancos que já têm as tabelas
(produção), cada bloco é pulado e nada muda.

Revision ID: b1c2d3e4f5a6
Revises: 9fd817c07f0d
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '9fd817c07f0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tabelas_existentes():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return set(inspector.get_table_names())


def upgrade() -> None:
    existentes = _tabelas_existentes()

    if 'lojas' not in existentes:
        op.create_table(
            'lojas',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('nome', sa.String(), index=True),
            sa.Column('cnpj', sa.String(), unique=True, index=True),
            sa.Column('telefone', sa.String(), nullable=True),
            sa.Column('endereco', sa.String(), nullable=True),
            sa.Column('email', sa.String(), nullable=True),
            sa.Column('website', sa.String(), nullable=True),
            sa.Column('logo_url', sa.String(), nullable=True),
            sa.Column('termos_garantia', sa.Text(), nullable=True),
        )

    if 'usuarios' not in existentes:
        op.create_table(
            'usuarios',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('nome', sa.String(), nullable=False),
            sa.Column('email', sa.String(), unique=True, index=True, nullable=False),
            sa.Column('senha_hash', sa.String(), nullable=False),
            sa.Column('cargo', sa.String(), nullable=False, server_default='tecnico'),
            sa.Column('ativo', sa.Boolean(), server_default=sa.true()),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), nullable=False, index=True),
            sa.Column('taxa_comissao', sa.Numeric(5, 2), server_default='0.00'),
        )

    if 'clientes' not in existentes:
        op.create_table(
            'clientes',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('nome', sa.String(), index=True),
            sa.Column('telefone', sa.String(), index=True),
            sa.Column('email', sa.String(), nullable=True),
            sa.Column('cpf', sa.String(), nullable=True, index=True),
            sa.Column('data_cadastro', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), index=True),
        )

    if 'produtos' not in existentes:
        op.create_table(
            'produtos',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('nome', sa.String(), index=True, nullable=False),
            sa.Column('marca', sa.String(), nullable=True),
            sa.Column('codigo_barras', sa.String(), index=True, nullable=True),
            sa.Column('codigo_modelo', sa.String(), nullable=True),
            sa.Column('fornecedor', sa.String(), nullable=True),
            sa.Column('categoria', sa.String(), server_default='Outros', index=True),
            sa.Column('is_servico', sa.Boolean(), server_default=sa.false()),
            sa.Column('localizacao', sa.String(), nullable=True),
            sa.Column('preco_custo', sa.Numeric(10, 2), nullable=True),
            sa.Column('preco_venda', sa.Float(), nullable=False),
            sa.Column('estoque_atual', sa.Integer(), server_default='0'),
            sa.Column('estoque_reservado', sa.Integer(), server_default='0'),
            sa.Column('estoque_minimo', sa.Integer(), server_default='5'),
            sa.Column('ativo', sa.Boolean(), server_default=sa.true()),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), index=True),
        )

    if 'ordens_servico' not in existentes:
        op.create_table(
            'ordens_servico',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('data_inicio_reparo', sa.DateTime(timezone=True), nullable=True),
            sa.Column('data_fim_reparo', sa.DateTime(timezone=True), nullable=True),
            sa.Column('marca', sa.String(), nullable=False),
            sa.Column('modelo', sa.String(), nullable=False),
            sa.Column('imei', sa.String(), nullable=True),
            sa.Column('senha_aparelho', sa.String(), nullable=True),
            sa.Column('acessorios', sa.String(), nullable=True),
            sa.Column('defeito', sa.Text(), nullable=False),
            sa.Column('checklist', sa.Text(), nullable=True),
            sa.Column('prioridade', sa.String(), server_default='Normal'),
            sa.Column('status', sa.String(), server_default='Aguardando Análise', index=True),
            sa.Column('observacoes_balcao', sa.Text(), nullable=True),
            sa.Column('foto_url', sa.String(), nullable=True),
            sa.Column('laudo_tecnico', sa.Text(), nullable=True),
            sa.Column('pecas_necessarias', sa.Text(), nullable=True),
            sa.Column('valor_orcamento', sa.Numeric(10, 2), server_default='0'),
            sa.Column('valor_mao_de_obra', sa.Numeric(10, 2), server_default='0'),
            sa.Column('horas_tecnicas', sa.Float(), server_default='0.0'),
            sa.Column('data_entrada', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
            sa.Column('data_conclusao', sa.DateTime(timezone=True), nullable=True),
            sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('clientes.id'), nullable=False, index=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False, index=True),
            sa.Column('tecnico_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True, index=True),
            sa.Column('atendente_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=True, index=True),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), nullable=False, index=True),
            sa.Column('ativo', sa.Boolean(), server_default=sa.true()),
        )

    if 'itens_os' not in existentes:
        op.create_table(
            'itens_os',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('os_id', sa.Integer(), sa.ForeignKey('ordens_servico.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('produto_id', sa.Integer(), sa.ForeignKey('produtos.id'), nullable=False, index=True),
            sa.Column('nome_produto', sa.String(), nullable=True),
            sa.Column('quantidade', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('preco_unitario', sa.Numeric(10, 2), nullable=False),
        )

    if 'movimentacoes_estoque' not in existentes:
        op.create_table(
            'movimentacoes_estoque',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('produto_id', sa.Integer(), sa.ForeignKey('produtos.id'), nullable=False, index=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False, index=True),
            sa.Column('tipo', sa.String(), nullable=False),
            sa.Column('quantidade', sa.Integer(), nullable=False),
            sa.Column('data_movimentacao', sa.DateTime(), nullable=True),
            sa.Column('observacao', sa.String(), nullable=True),
        )

    if 'transacoes_financeiras' not in existentes:
        op.create_table(
            'transacoes_financeiras',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), nullable=False, index=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False, index=True),
            sa.Column('tipo', sa.String(), nullable=False),
            sa.Column('categoria', sa.String(), nullable=False),
            sa.Column('valor', sa.Float(), nullable=False),
            sa.Column('descricao', sa.String(), nullable=True),
            sa.Column('data_transacao', sa.DateTime(), nullable=True, index=True),
            sa.Column('ordem_servico_id', sa.Integer(), sa.ForeignKey('ordens_servico.id'), nullable=True, index=True),
        )

    if 'vendas' not in existentes:
        op.create_table(
            'vendas',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('valor_total', sa.Numeric(10, 2), nullable=False),
            sa.Column('forma_pagamento', sa.String(), nullable=False, server_default='Dinheiro'),
            sa.Column('data_venda', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
            sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('clientes.id'), nullable=True, index=True),
            sa.Column('os_id', sa.Integer(), sa.ForeignKey('ordens_servico.id'), nullable=True, index=True),
            sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False, index=True),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), nullable=False, index=True),
        )

    if 'itens_venda' not in existentes:
        op.create_table(
            'itens_venda',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('quantidade', sa.Integer(), nullable=False),
            sa.Column('preco_unitario', sa.Numeric(10, 2), nullable=False),
            sa.Column('venda_id', sa.Integer(), sa.ForeignKey('vendas.id'), nullable=False, index=True),
            sa.Column('produto_id', sa.Integer(), sa.ForeignKey('produtos.id'), nullable=False, index=True),
        )

    if 'solicitacoes_compra' not in existentes:
        op.create_table(
            'solicitacoes_compra',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('produto_solicitado', sa.String(), nullable=False),
            sa.Column('quantidade', sa.Integer(), server_default='1'),
            sa.Column('origem', sa.String(), nullable=False),
            sa.Column('prioridade', sa.String(), server_default='Normal'),
            sa.Column('status', sa.String(), server_default='Pendente', index=True),
            sa.Column('os_id', sa.Integer(), sa.ForeignKey('ordens_servico.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('observacao', sa.String(), nullable=True),
            sa.Column('data_solicitacao', sa.DateTime(), nullable=True),
            sa.Column('loja_id', sa.Integer(), sa.ForeignKey('lojas.id'), nullable=False, index=True),
        )


def downgrade() -> None:
    # Downgrade intencionalmente não é suportado: esta migration só cria o
    # que estiver faltando (nunca dropa nada em produção), então não há um
    # estado anterior seguro para restaurar automaticamente.
    pass
