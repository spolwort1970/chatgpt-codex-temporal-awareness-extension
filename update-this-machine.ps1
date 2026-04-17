Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location $repoRoot

git pull --ff-only

& (Join-Path $repoRoot "codex-cli\install-time-helper.ps1")

Write-Output ""
Write-Output "Machine update complete."
Write-Output "Start a brand-new codex session to load the updated MCP config and instructions."
