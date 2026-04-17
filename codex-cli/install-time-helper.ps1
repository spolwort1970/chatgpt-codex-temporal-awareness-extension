Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sourceDir = Join-Path $PSScriptRoot "time-helper"
$targetDir = "C:\tools\time-helper"
$configPath = Join-Path $env:USERPROFILE ".codex\config.toml"
$mcpServerPath = Join-Path $PSScriptRoot "mcp-time-server\server.js"
$mcpServerPathEscaped = $mcpServerPath.Replace('\', '\\')
$mcpServerBlock = @"
[mcp_servers.time_helper]
command = "node"
args = ["$mcpServerPathEscaped"]

[mcp_servers.time_helper.tools.current_time]
approval_mode = "approve"

"@
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

if (-not (Test-Path -LiteralPath $sourceDir)) {
    throw "Source helper directory not found: $sourceDir"
}

if (-not (Test-Path -LiteralPath $mcpServerPath)) {
    throw "MCP server entrypoint not found: $mcpServerPath"
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $targetDir -Force

if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Codex config not found: $configPath"
}

$configText = Get-Content -LiteralPath $configPath -Raw
$instructionsBody = ($instructionsLines -join [Environment]::NewLine)
$instructionsBlock = "instructions = '''" + [Environment]::NewLine + $instructionsBody + [Environment]::NewLine + "'''" + [Environment]::NewLine + [Environment]::NewLine
$developerInstructionBody = ($developerInstructionLines -join [Environment]::NewLine)
$developerInstructionsBlock = "developer_instructions = '''" + [Environment]::NewLine + $developerInstructionBody + [Environment]::NewLine + "'''" + [Environment]::NewLine + [Environment]::NewLine
$withoutDeveloperInstructions = [regex]::Replace($configText, "(?ms)^developer_instructions\s*=\s*'''.*?'''\s*", '', 1)
$withoutInstructions = [regex]::Replace($withoutDeveloperInstructions, "(?ms)^instructions\s*=\s*'''.*?'''\s*", '', 1)
$withoutMcpToolConfig = [regex]::Replace($withoutInstructions, "(?ms)^\[mcp_servers\.time_helper\.tools\.current_time\]\s*approval_mode\s*=\s*""[^""]*""\s*", '', 1)
$withoutMcpServerConfig = [regex]::Replace($withoutMcpToolConfig, "(?ms)^\[mcp_servers\.time_helper\]\s*command\s*=\s*""[^""]*""\s*args\s*=\s*\[[^\]]*\]\s*", '', 1)
$updated = $developerInstructionsBlock + $instructionsBlock + $mcpServerBlock + $withoutMcpServerConfig.TrimStart()

if ($updated -ne $configText) {
    Set-Content -LiteralPath $configPath -Value $updated
}

Write-Output "Installed time helper to $targetDir"
Write-Output "Updated Codex config at $configPath"
Write-Output "Configured MCP server at $mcpServerPath"
