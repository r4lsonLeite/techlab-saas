"""
Gera o comando SQL para criar/corrigir o usuário ADMIN diretamente no banco
do Render/Neon, usando o MESMO algoritmo de hash (bcrypt) que a aplicação
usa para validar login (backend/app/core/security.py).

COMO USAR:
1. Rode este script na sua máquina, dentro da pasta do projeto, com o
   ambiente virtual do backend ativado (onde bcrypt já está instalado):

   Windows (PowerShell):
       venv\\Scripts\\activate
       python gerar_admin_sql.py

   Linux/Mac:
       source venv/bin/activate
       python gerar_admin_sql.py

2. O script vai pedir nome, email, senha e loja_id.
3. Ele imprime um comando SQL pronto (INSERT ou UPDATE).
4. Copie o SQL e execute no painel do Neon (SQL Editor) ou via psql/DBeaver.
"""

import bcrypt
import getpass

def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def main():
    print("=== Gerador de SQL para usuário ADMIN (TechLab) ===\n")

    nome = input("Nome do admin [Administrador]: ").strip() or "Administrador"
    email = input("Email do admin: ").strip()
    senha = getpass.getpass("Senha do admin (não aparece na tela): ").strip()
    confirmar = getpass.getpass("Confirme a senha: ").strip()

    if senha != confirmar:
        print("\n[ERRO] As senhas não coincidem. Rode o script novamente.")
        return

    if not email or not senha:
        print("\n[ERRO] Email e senha são obrigatórios.")
        return

    loja_id = input("loja_id (ID da loja já existente no banco) [1]: ").strip() or "1"

    hash_gerado = gerar_hash(senha)

    print("\n" + "=" * 70)
    print("HASH GERADO (confira que começa com $2b$):")
    print(hash_gerado)
    print("=" * 70)

    print("\n--- OPÇÃO A: usuário NOVO (INSERT) ---")
    print(f"""
INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo, loja_id, taxa_comissao)
VALUES (
    '{nome}',
    '{email}',
    '{hash_gerado}',
    'admin',
    true,
    {loja_id},
    0.00
);
""")

    print("--- OPÇÃO B: usuário JÁ EXISTE, só corrigir a senha (UPDATE) ---")
    print(f"""
UPDATE usuarios
SET senha_hash = '{hash_gerado}',
    cargo = 'admin',
    ativo = true
WHERE email = '{email}';
""")

    print("Dica: se a Loja com esse loja_id ainda não existir, crie-a antes, ex:")
    print(f"""
INSERT INTO lojas (id, nome, cnpj)
VALUES ({loja_id}, 'Minha Loja', '00000000000000')
ON CONFLICT (id) DO NOTHING;
""")

if __name__ == "__main__":
    main()