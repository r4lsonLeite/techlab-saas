from core.database import engine
from sqlalchemy import text

print("Injetando a coluna 'valor' no banco de dados...")

try:
    with engine.connect() as conn:
        
        conn.execute(text("ALTER TABLE ordens_servico ADD COLUMN valor FLOAT DEFAULT 0.0;"))
        conn.commit()
    print("✅ Sucesso Absoluto! A coluna 'valor' foi criada e o banco está perfeito.")
except Exception as e:
    print(f"⚠️ Erro: {e}")
    