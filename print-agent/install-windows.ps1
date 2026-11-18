param(
  [string]$TaskName = "BOM PA POXA - Impressora",
  [string]$NodePath = "",
  [string]$AgentDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $AgentDir) {
  $AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $NodePath) {
  $NodePath = (Get-Command node -ErrorAction Stop).Source
}

$agentFile = Join-Path $AgentDir "agent.mjs"
$configFile = Join-Path $AgentDir "agent.config.json"

if (-not (Test-Path -LiteralPath $agentFile)) {
  throw "agent.mjs não encontrado em $AgentDir"
}
if (-not (Test-Path -LiteralPath $configFile)) {
  throw "agent.config.json não encontrado. Copie config.example.json e preencha os dados."
}

$action = "`"$NodePath`" `"$agentFile`""
Write-Host "Registrando tarefa '$TaskName' para iniciar no logon..."
Write-Host "Node: $NodePath"
Write-Host "Pasta: $AgentDir"

schtasks /Create /TN "$TaskName" /TR "$action" /SC ONLOGON /RL LIMITED /F | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível criar a tarefa agendada. Execute o PowerShell como administrador ou ajuste a política de tarefas."
}

Write-Host "Iniciando o agente agora..."
schtasks /Run /TN "$TaskName" | Out-Host
Write-Host "Tarefa registrada. O agente será iniciado a cada logon do usuário atual."
Write-Host "Para remover: .\uninstall-windows.ps1"
