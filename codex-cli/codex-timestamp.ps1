param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-CodexCommandPath {
  $cmd = Get-Command "codex.cmd" -ErrorAction SilentlyContinue

  if ($cmd -and $cmd.Source) {
    return $cmd.Source
  }

  $defaultPath = Join-Path $env:APPDATA "npm\codex.cmd"

  if (Test-Path $defaultPath) {
    return $defaultPath
  }

  throw "Unable to locate codex.cmd on PATH."
}

function Format-TimestampPrefix {
  $now = Get-Date
  if ([System.TimeZoneInfo]::Local.IsDaylightSavingTime($now)) {
    $zone = [System.TimeZoneInfo]::Local.DaylightName
  } else {
    $zone = [System.TimeZoneInfo]::Local.StandardName
  }

  $abbreviation = switch -Regex ($zone) {
    "\bPacific\b.*\bDaylight\b" { "PDT"; break }
    "\bPacific\b.*\bStandard\b" { "PST"; break }
    "\bMountain\b.*\bDaylight\b" { "MDT"; break }
    "\bMountain\b.*\bStandard\b" { "MST"; break }
    "\bCentral\b.*\bDaylight\b" { "CDT"; break }
    "\bCentral\b.*\bStandard\b" { "CST"; break }
    "\bEastern\b.*\bDaylight\b" { "EDT"; break }
    "\bEastern\b.*\bStandard\b" { "EST"; break }
    default { $zone }
  }

  return "[{0} {1}]" -f $now.ToString("yyyy-MM-dd HH:mm:ss"), $abbreviation
}

function Add-TimestampPrefix {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt
  )

  if ([string]::IsNullOrWhiteSpace($Prompt)) {
    return $Prompt
  }

  if ($Prompt -match '^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [^\]]+\]\s') {
    return $Prompt
  }

  return "{0} {1}" -f (Format-TimestampPrefix), $Prompt
}

function Invoke-Codex {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CodexPath,

    [Parameter(Mandatory = $true)]
    [string[]]$ForwardArguments
  )

  & $CodexPath @ForwardArguments
}

function Protect-ExecPrompt {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$CliArguments
  )

  $optionsWithValues = @(
    "-c", "--config",
    "--enable", "--disable",
    "-i", "--image",
    "-m", "--model",
    "-s", "--sandbox",
    "-p", "--profile",
    "-C", "--cd",
    "--add-dir",
    "--output-schema",
    "--color",
    "-o", "--output-last-message"
  )

  $rewritten = New-Object System.Collections.Generic.List[string]
  $promptHandled = $false

  if ($CliArguments.Length -gt 0) {
    $rewritten.Add($CliArguments[0])
  }

  for ($index = 1; $index -lt $CliArguments.Length; $index++) {
    $argument = $CliArguments[$index]
    $rewritten.Add($argument)

    if ($argument -eq "--") {
      continue
    }

    if ($optionsWithValues -contains $argument) {
      $index++
      if ($index -lt $CliArguments.Length) {
        $rewritten.Add($CliArguments[$index])
      }
      continue
    }

    if (-not $promptHandled -and -not $argument.StartsWith("-")) {
      $promptHandled = $true
      $rewritten[$rewritten.Count - 1] = Add-TimestampPrefix -Prompt $argument
      continue
    }
  }

  return $rewritten.ToArray()
}

function Protect-InteractivePrompt {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$CliArguments
  )

  $optionsWithValues = @(
    "-c", "--config",
    "--enable", "--disable",
    "--remote",
    "--remote-auth-token-env",
    "-i", "--image",
    "-m", "--model",
    "-p", "--profile",
    "-s", "--sandbox",
    "-a", "--ask-for-approval",
    "-C", "--cd",
    "--add-dir"
  )

  $rewritten = New-Object System.Collections.Generic.List[string]
  $promptHandled = $false

  for ($index = 0; $index -lt $CliArguments.Length; $index++) {
    $argument = $CliArguments[$index]
    $rewritten.Add($argument)

    if ($optionsWithValues -contains $argument) {
      $index++
      if ($index -lt $CliArguments.Length) {
        $rewritten.Add($CliArguments[$index])
      }
      continue
    }

    if (-not $promptHandled -and -not $argument.StartsWith("-")) {
      $promptHandled = $true
      $rewritten[$rewritten.Count - 1] = Add-TimestampPrefix -Prompt $argument
    }
  }

  return $rewritten.ToArray()
}

$codexPath = Get-CodexCommandPath

if ($Arguments.Length -eq 0) {
  Invoke-Codex -CodexPath $codexPath -ForwardArguments @()
  exit $LASTEXITCODE
}

if ($Arguments[0] -eq "exec") {
  $forwardArguments = Protect-ExecPrompt -CliArguments $Arguments
  Invoke-Codex -CodexPath $codexPath -ForwardArguments $forwardArguments
  exit $LASTEXITCODE
}

$forwardArguments = Protect-InteractivePrompt -CliArguments $Arguments
Invoke-Codex -CodexPath $codexPath -ForwardArguments $forwardArguments
exit $LASTEXITCODE
