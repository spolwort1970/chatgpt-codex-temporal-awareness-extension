# Context Bridge Server

Small localhost-only API wrapper around `context-bridge`.

This is the automation layer for browser clients. It is not the MCP server itself, and it does not replace Codex MCP usage.

## Usage

```powershell
cd C:\github\chatgpt-codex-temporal-awareness-extension\codex-cli\context-bridge-server
node .\server.js
```

Default bind:

- `http://127.0.0.1:4317`

## Endpoints

### `GET /context?mode=minimal`

Returns JSON:

```json
{
  "contextBlock": "[CTX]\n...\n[/CTX]"
}
```

Supported modes:

- `minimal`
- `extended`

If `debug=1` is supplied, debug output from the wrapped CLI is included as a `debug` array.

### `GET /healthz`

Returns:

```json
{ "ok": true }
```

## Behavior

- captures CLI stdout
- suppresses CLI stderr unless debug mode is requested
- rejects invalid or oversized output
- returns `503` on spawn failures, timeouts, or invalid output
- binds to localhost only

## Windows Auto-Start

Recommended startup path: Windows Task Scheduler at logon.

Wrapper files:

- `run-context-bridge-server.ps1`
- `run-context-bridge-server.cmd`

Recommended task action:

- Program/script:
  `powershell.exe`
- Add arguments:
  `-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\github\chatgpt-codex-temporal-awareness-extension\codex-cli\context-bridge-server\run-context-bridge-server.ps1"`
- Start in:
  `C:\github\chatgpt-codex-temporal-awareness-extension\codex-cli\context-bridge-server`

Recommended task settings:

- Trigger: `At log on`
- Run only when user is logged on
- Do not store password
- Configure for: `Windows 10` or newer
- If the task is already running: `Do not start a new instance`
- Restart on failure: every `1 minute`, up to `3` times

Node path caveat:

- the wrapper first uses `node` from `PATH`
- if that fails, it checks common Windows install paths
- if Node is installed in a custom location and not on `PATH`, update the wrapper or your user `PATH`

## Verify It Is Running

### Confirm the scheduled task exists

Open Task Scheduler and verify the task is present, enabled, and set to run `At log on`.

Or in PowerShell:

```powershell
Get-ScheduledTask | Where-Object { $_.TaskName -like "*context*bridge*" }
```

### Confirm the server is listening on `127.0.0.1:4317`

```powershell
netstat -ano | findstr 4317
```

You want to see a listener bound to `127.0.0.1:4317`.

### Confirm `/healthz`

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4317/healthz | Select-Object -ExpandProperty Content
```

Expected response:

```json
{ "ok": true }
```

### If ChatGPT sends without `[CTX]`

Check these in order:

1. the bridge server is running and `/healthz` returns `{ "ok": true }`
2. the extension option `Auto-inject localhost context` is enabled
3. the extension has been reloaded after recent code changes
4. the ChatGPT tab has been refreshed after reloading the extension
5. `http://127.0.0.1:4317/context?mode=minimal` returns JSON with `contextBlock`
