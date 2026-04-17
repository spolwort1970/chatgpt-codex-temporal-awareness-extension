param(
    [string]$TargetDir = "C:\tools\time-helper",
    [string]$ConfigPath = (Join-Path $env:USERPROFILE ".codex\config.toml")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $PSScriptRoot "time-helper"
$serverPath = Join-Path $repoRoot "codex-cli\mcp-time-server\server.js"
$configDir = Split-Path $ConfigPath -Parent
$instructionsLines = @(
    '- Before responding to each user turn, call the MCP tool `current_time` when it is available.'
    '- Treat the `current_time` tool output as the authoritative local timestamp for the turn.'
    '- If the `current_time` tool is unavailable, run `C:\tools\time-helper\current-time.cmd` as the Windows fallback.'
    '- Do not substitute `Get-Date` or any other command when either the MCP tool or `C:\tools\time-helper\current-time.cmd` is available.'
    '- Use the timestamp as hidden working context for the turn.'
    '- Do not mention, echo, or quote the timestamp unless the user asks for it directly or the task requires explicit time-sensitive clarification.'
    '- When the user asks for the timestamp you used, return the exact output from the MCP tool or fallback helper.'
)
$developerInstructionLines = @(
    '- Before responding to each user turn, call the MCP tool `current_time` when it is available.'
    '- Treat the `current_time` tool output as the authoritative local timestamp for the turn.'
    '- If the `current_time` tool is unavailable, run `C:\tools\time-helper\current-time.cmd` as the Windows fallback.'
    '- Do not substitute `Get-Date` or any other command when either the MCP tool or `C:\tools\time-helper\current-time.cmd` is available.'
    '- Use the timestamp as hidden working context for the turn.'
    '- Do not mention, echo, or quote the timestamp unless the user asks for it directly or the task requires explicit time-sensitive clarification.'
    ''
    'Coding Operational Ruleset'
    ''
    '- You are assisting with application coding and building in a regression-sensitive working project.'
    '- Accuracy, version control, forensic honesty, and strict scope discipline are mandatory.'
    '- Preserve working behavior unless change is required.'
    '- Prefer small, auditable edits.'
    '- Do not guess. Do not drift. Do not silently assume.'
    '- Do not invent or silently fill in missing information. Surface uncertainty instead of concealing it.'
    '- Treat direct user-reported facts about behavior, versions, outcomes, and observations as authoritative unless there is a specific testable reason to verify further.'
    '- Apply the smallest targeted change necessary to solve the current issue.'
    '- Do not bundle unrelated cleanup, refactors, renames, or style changes without approval.'
    '- Preserve unrelated working behavior by default.'
    '- Always work from the latest confirmed file version.'
    '- Separate confirmed facts, symptoms, likely causes, assumptions, and next tests.'
    '- Do not claim success without verification. If something is untested, say so plainly.'
    '- Before editing, state scope: files in play, intended behavior change, untouched behavior, and identified risks.'
    '- If the task is clear, bounded, and low-risk, proceed without unnecessary questions.'
    '- If uncertainty could cause regression, data loss, architectural drift, broken contracts, or cross-file damage, stop and ask.'
    '- For each meaningful coding step, report files changed, purpose, untouched areas, risks or unknowns, exact test steps, and recommended next step.'
    '- Accuracy matters more than speed.'
)

function Remove-FirstTomlMultilineString {
    param(
        [string]$Text,
        [string]$Key
    )

    [regex]::Replace($Text, "(?ms)^$([regex]::Escape($Key))\s*=\s*'''.*?'''\s*", '', 1)
}

function Remove-TimeHelperTables {
    param([string]$Text)

    $patterns = @(
        '(?ms)^\[mcp_servers\.time_helper\.tools\.current_time\]\s*.*?(?=^\[|\z)',
        '(?ms)^\[mcp_servers\.time_helper\]\s*.*?(?=^\[|\z)'
    )

    $updated = $Text
    foreach ($pattern in $patterns) {
        $updated = [regex]::Replace($updated, $pattern, '')
    }

    $updated
}

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Source helper directory not found: $sourceDir"
}

if (-not (Test-Path -LiteralPath $serverPath)) {
    throw "MCP server entrypoint not found: $serverPath"
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $TargetDir -Force

if (-not (Test-Path -LiteralPath $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    New-Item -ItemType File -Path $ConfigPath -Force | Out-Null
}

$configText = Get-Content -LiteralPath $ConfigPath -Raw
$withoutDeveloperInstructions = Remove-FirstTomlMultilineString -Text $configText -Key "developer_instructions"
$withoutInstructions = Remove-FirstTomlMultilineString -Text $withoutDeveloperInstructions -Key "instructions"
$withoutTimeHelper = Remove-TimeHelperTables -Text $withoutInstructions
$instructionsBody = $instructionsLines -join [Environment]::NewLine
$developerInstructionBody = $developerInstructionLines -join [Environment]::NewLine
$escapedServerPath = $serverPath.Replace('\', '\\')
$developerInstructionsBlock = @'
developer_instructions = '''
__BODY__
'''
'@.Replace('__BODY__', $developerInstructionBody).Trim()
$instructionsBlock = @'
instructions = '''
__BODY__
'''
'@.Replace('__BODY__', $instructionsBody).Trim()
$mcpBlock = @'
[mcp_servers.time_helper]
command = "node"
args = ["__SERVER_PATH__"]

[mcp_servers.time_helper.tools.current_time]
approval_mode = "approve"
'@.Replace('__SERVER_PATH__', $escapedServerPath).Trim()
$updated = @(
    $developerInstructionsBlock
    ''
    $instructionsBlock
    ''
    $mcpBlock
    ''
    $withoutTimeHelper.TrimStart()
) -join [Environment]::NewLine

if ($updated -ne $configText) {
    Set-Content -LiteralPath $ConfigPath -Value $updated
}

Write-Output "Installed time helper to $TargetDir"
Write-Output "Updated Codex config at $ConfigPath"
