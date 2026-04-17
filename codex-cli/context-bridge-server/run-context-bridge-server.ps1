Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $serverDir "server.js"

if (-not (Test-Path -LiteralPath $serverScript)) {
    throw "Server entrypoint not found: $serverScript"
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
    $fallbackCandidates = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe"
    )

    foreach ($candidate in $fallbackCandidates) {
        if (Test-Path -LiteralPath $candidate) {
            $nodeCommand = [pscustomobject]@{ Source = $candidate }
            break
        }
    }
}

if (-not $nodeCommand) {
    throw "Node.js executable not found on PATH or common install paths."
}

Set-Location -LiteralPath $serverDir
& $nodeCommand.Source $serverScript
