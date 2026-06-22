# Corrige o nome de arquivos __init__py -> __init__.py
# (estao sem o ponto antes de "py", o que e um erro de digitacao).
# Rode na raiz do projeto, no PowerShell, depois de usar limpar_projeto.ps1.

function Rename-IfExists {
    param([string]$Path, [string]$NewName)
    if (Test-Path $Path) {
        Rename-Item -Path $Path -NewName $NewName
        Write-Host "    -> renomeado: $Path  ->  $NewName"
    } else {
        Write-Host "    -> (nao encontrado, ja deve estar corrigido): $Path"
    }
}

Rename-IfExists "backend\app\core\__init__py" "__init__.py"
Rename-IfExists "backend\app\models\__init__py" "__init__.py"
Rename-IfExists "backend\app\schemas\__init__py" "__init__.py"

Write-Host ""
Write-Host "Concluido."