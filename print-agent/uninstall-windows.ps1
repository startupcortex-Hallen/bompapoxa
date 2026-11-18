param(
  [string]$TaskName = "BOM PA POXA - Impressora"
)

$ErrorActionPreference = "Stop"
schtasks /End /TN "$TaskName" 2>$null | Out-Null
schtasks /Delete /TN "$TaskName" /F | Out-Host
Write-Host "Tarefa '$TaskName' removida."
