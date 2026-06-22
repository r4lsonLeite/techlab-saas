# ============================================================
# Script de limpeza - TechLab SaaS (versão PowerShell / Windows)
# Remove pastas/arquivos duplicados, lixo de editor e itens
# que nunca deveriam ter sido versionados.
#
# COMO USAR:
#   1. Coloque este arquivo na RAIZ do projeto (mesma pasta
#      onde estão "backend", "frontend", "venv", etc).
#   2. No PowerShell, dentro dessa pasta, rode:
#         .\limpar_projeto.ps1
#      Se aparecer erro de "política de execução", rode antes:
#         Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
#   3. Revise o "git status" (se usar git) antes de comitar.
#
# Este script NÃO toca em:
#   - backend/app/uploads/  (uploads reais de evidências/fotos)
#   - alembic/versions/     (histórico de migrations)
#   - .env                  (suas variáveis de ambiente)
# ============================================================

function Remove-IfExists {
    param([string]$Path)
    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
        Write-Host "    -> removido: $Path"
    } else {
        Write-Host "    -> (nao encontrado, ja estava ausente): $Path"
    }
}

Write-Host ""
Write-Host "=== 1. Ambientes virtuais Python duplicados/pesados ==="
Write-Host "    (venv nao deve ir para o repo; cada dev cria o seu)"
Remove-IfExists "venv"
Remove-IfExists "backend\venv"

Write-Host ""
Write-Host "=== 2. node_modules duplicados/pesados ==="
Write-Host "    (cada dev reinstala com 'npm install')"
Remove-IfExists "node_modules"
Remove-IfExists "frontend\node_modules"

Write-Host ""
Write-Host "=== 3. requirements.txt e package*.json duplicados na raiz ==="
Write-Host "    (a versao oficial fica dentro de backend/ e frontend/)"
Remove-IfExists "requirements.txt"
Remove-IfExists "package.json"
Remove-IfExists "package-lock.json"

Write-Host ""
Write-Host "=== 4. Pastas 'uploads' vazias e orfas ==="
Write-Host "    (a pasta real usada pelo backend e backend/app/uploads)"
Remove-IfExists "uploads"
Remove-IfExists "backend\uploads"

Write-Host ""
Write-Host "=== 5. Bancos SQLite de desenvolvimento/teste ==="
Write-Host "    (producao usa Postgres no Neon; esses .db sao so lixo local)"
Remove-IfExists "techlab.db"
Remove-IfExists "backend\banco_de_testes.db"

Write-Host ""
Write-Host "=== 6. Pasta docker-compose.yml (e um diretorio vazio por engano) ==="
if (Test-Path "docker-compose.yml" -PathType Container) {
    Remove-Item "docker-compose.yml" -Recurse -Force
    Write-Host "    -> removida pasta vazia docker-compose.yml"
} else {
    Write-Host "    -> nada a fazer (ja nao e uma pasta)"
}

Write-Host ""
Write-Host "=== 7. Lixo de editor (Code Runner) ==="
Remove-IfExists "backend\app\tempCodeRunnerFile.py"
Remove-IfExists "backend\app\core\tempCodeRunnerFile.py"

Write-Host ""
Write-Host "=== 8. Script de migracao avulso e ja obsoleto ==="
Write-Host "    (a coluna criada por ele ('valor') nao e mais usada;"
Write-Host "     o projeto hoje gerencia mudancas de schema via Alembic)"
Remove-IfExists "backend\app\add_valor.py"

Write-Host ""
Write-Host "=== 9. Caches Python (__pycache__, .pytest_cache) ==="
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force; Write-Host "    -> removido: $($_.FullName)" }
Remove-IfExists "backend\.pytest_cache"

Write-Host ""
Write-Host "=== CONCLUIDO ==="
Write-Host "Itens NAO removidos automaticamente (decisao manual):"
Write-Host "  - backend\app\core\__init__py"
Write-Host "  - backend\app\models\__init__py"
Write-Host "  - backend\app\schemas\__init__py"
Write-Host "    (estao com nome ERRADO: falta o ponto antes de 'py')"
Write-Host "    Use o script corrigir_init.ps1 para renomear esses arquivos."
Write-Host ""