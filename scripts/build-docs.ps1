param(
  [switch]$OpenAfterBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$doxyfilePath = Join-Path $repoRoot 'Doxyfile'
$outputPath = Join-Path $repoRoot 'build\docs\html\index.html'

if (-not (Test-Path -Path $doxyfilePath)) {
  throw 'Doxyfile not found at repository root.'
}

$doxygenCmd = Get-Command doxygen -ErrorAction SilentlyContinue
if ($null -eq $doxygenCmd) {
  Write-Host 'Doxygen is not installed or not on PATH.' -ForegroundColor Yellow
  Write-Host 'Install options (Windows):' -ForegroundColor Yellow
  Write-Host '1) winget install --id DimitriVanHeesch.Doxygen -e'
  Write-Host '2) choco install doxygen.install -y'
  throw 'Missing dependency: doxygen'
}

Push-Location $repoRoot
try {
  if (-not (Test-Path -Path (Join-Path $repoRoot 'build'))) {
    New-Item -ItemType Directory -Path (Join-Path $repoRoot 'build') | Out-Null
  }

  Write-Host 'Running Doxygen build...' -ForegroundColor Cyan
  & doxygen $doxyfilePath

  if (-not (Test-Path -Path $outputPath)) {
    throw 'Build finished but index.html was not generated.'
  }

  Write-Host 'Documentation generated successfully.' -ForegroundColor Green
  Write-Host "Output: $outputPath" -ForegroundColor Green

  if ($OpenAfterBuild) {
    Start-Process $outputPath
  }
}
finally {
  Pop-Location
}
