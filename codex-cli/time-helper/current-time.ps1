Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-TimezoneAbbreviation([string]$name) {
    if ([string]::IsNullOrWhiteSpace($name)) {
        return ""
    }

    $letters = foreach ($part in ($name -split "\s+")) {
        if (-not [string]::IsNullOrWhiteSpace($part)) {
            $part.Substring(0, 1).ToUpperInvariant()
        }
    }

    return ($letters -join "")
}

function Get-LocalTimestamp {
    $now = Get-Date
    $zone = [System.TimeZoneInfo]::Local
    $zoneName = $zone.StandardName

    if ($zone.IsDaylightSavingTime($now)) {
        $zoneName = $zone.DaylightName
    }

    [PSCustomObject]@{
        timestamp = $now.ToString("yyyy-MM-dd HH:mm:ss")
        abbreviation = Get-TimezoneAbbreviation $zoneName
        timezone_name = $zoneName
        timezone = $zone.Id
        iso8601 = $now.ToString("o")
    }
}

$payload = Get-LocalTimestamp
$abbreviation = $payload.abbreviation

if ([string]::IsNullOrWhiteSpace($abbreviation)) {
    $abbreviation = $payload.timezone
}

"[{0} {1}] ({2})" -f $payload.timestamp, $abbreviation, $payload.timezone_name
