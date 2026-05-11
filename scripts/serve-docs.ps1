param(
  [int]$Port = 8080
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$htmlDir = Join-Path $repoRoot 'build\docs\html'

if (-not (Test-Path -Path $htmlDir)) {
  Write-Host 'No generated docs found. Building first...' -ForegroundColor Yellow
  & (Join-Path $scriptDir 'build-docs.ps1')
}

Push-Location $htmlDir
try {
  Write-Host "Serving docs at http://localhost:$Port" -ForegroundColor Cyan
  Write-Host 'Press Ctrl+C to stop.' -ForegroundColor Cyan
  python -m http.server $Port
}
finally {
  Pop-Location
}
