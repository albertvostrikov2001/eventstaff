# Деплой на Timeweb VPS одной командой с вашего ПК.
# Из корня репозитория (PowerShell):
#   .\scripts\deploy-to-timeweb.ps1
#   .\scripts\deploy-to-timeweb.ps1 -Ip 147.45.235.70 -RepoUrl https://github.com/you/repo.git
# Потребуется пароль SSH root или настроенный ключ.

param(
  [string] $Ip = "147.45.235.70",
  [string] $RepoUrl = "https://github.com/albertvostrikov2001/eventstaff.git"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrap = Join-Path $scriptDir "timeweb-vps-bootstrap.sh"

if (-not (Test-Path -LiteralPath $bootstrap)) {
  Write-Error "Bootstrap script not found: $bootstrap"
}

$remoteCmd = "export APP_IP=$Ip; export REPO_URL=$RepoUrl; bash -s"

Write-Host "Connecting root@${Ip}, running bootstrap (may take several minutes)..." -ForegroundColor Cyan
Get-Content -LiteralPath $bootstrap -Raw | ssh -o StrictHostKeyChecking=accept-new "root@$Ip" $remoteCmd

if ($LASTEXITCODE -ne 0) {
  Write-Host "SSH or bootstrap failed (exit $LASTEXITCODE)." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host "Done. Open: http://${Ip}/" -ForegroundColor Green
