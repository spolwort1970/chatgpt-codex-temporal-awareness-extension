Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceDir = Join-Path $PSScriptRoot "time-helper"
$targetDir = "C:\tools\time-helper"
$configPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$instructionLines = @(
    '- Before responding to every user turn, run `C:\tools\time-helper\current-time.cmd`.'
    '- Treat that command output as the authoritative local timestamp for the turn.'
    '- Do not substitute `Get-Date` or any other command when `C:\tools\time-helper\current-time.cmd` is available.'
    '- When the user asks for the timestamp you used, return the helper output directly.'
)

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Source helper directory not found: $sourceDir"
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $targetDir -Force

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Codex config not found: $configPath"
}

$configText = Get-Content -LiteralPath $configPath -Raw

if ($instructionLines | Where-Object { $configText -notmatch [regex]::Escape($_) }) {
    $instructionBody = ($instructionLines -join [Environment]::NewLine)
    $instructionBlock = "instructions = '''" + [Environment]::NewLine + $instructionBody + [Environment]::NewLine + "'''" + [Environment]::NewLine + [Environment]::NewLine
    $withoutExisting = [regex]::Replace($configText, '(?ms)^instructions\s*=\s*\'\'\'.*?\'\'\'\s*', '', 1)
    $updated = $instructionBlock + $withoutExisting.TrimStart()
    Set-Content -LiteralPath $configPath -Value $updated
}

Write-Output "Installed time helper to $targetDir"
Write-Output "Updated Codex config at $configPath"
