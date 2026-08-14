import os

# Definidas antes de qualquer import da aplicação: core.security e core.database
# abortam o arranque se estas variáveis não existirem. Os testes correm sempre
# contra um SQLite local, nunca contra a base de dados real.
os.environ.setdefault("SECRET_KEY", "chave_de_teste_nao_usar_em_producao")
os.environ.setdefault("DATABASE_URL", "sqlite:///./banco_de_testes.db")
