# Context Bridge

`context-bridge` is a chat-facing context formatter. It is not the MCP server itself.

The CLI gathers a small set of local context, prefers the existing MCP/local time path when available, and emits a compact `[CTX]...[/CTX]` block for paste into chat interfaces that cannot call MCP tools directly.

## Usage

From `codex-cli/context-bridge/`:

```powershell
node .\bin\context-bridge.js
node .\bin\context-bridge.js --extended
node .\bin\context-bridge.js --note "Timestamp is authoritative" --note "Repo is in active dev"
node .\bin\context-bridge.js --copy
```

Or after linking/installing the package bin:

```powershell
context-bridge
context-bridge --extended
context-bridge --copy
```

## Options

- `--minimal`: emit the default compact block
- `--extended`: include cheap, stable extra fields
- `--copy`: copy the emitted block to the clipboard as well as printing it
- `--stdout`: explicit no-op; stdout is already the default
- `--note "<text>"`: add a short note, repeatable
- `--debug`: emit time-source diagnostics to stderr

## Time Source Precedence

The CLI resolves time in this order:

1. existing MCP server path in `codex-cli/mcp-time-server/server.js`
2. existing local time helper, preferring `C:\tools\time-helper\current-time.cmd` when installed
3. local Node fallback

If a preferred source is unavailable, the CLI degrades gracefully instead of failing the whole block.

## Example Minimal Output

```text
[CTX]
timestamp: 2026-04-16 19:04:10 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T19:04:10-07:00
  timezone: America/Los_Angeles
notes:
  - Timestamp is authoritative
[/CTX]
```

## Example Extended Output

```text
[CTX]
timestamp: 2026-04-16 19:04:10 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T19:04:10-07:00
  timezone: America/Los_Angeles
  hostname: MSI_Crossfire
  platform: win32
  cwd: C:\github\chatgpt-codex-temporal-awareness-extension
notes:
  - Timestamp is authoritative
[/CTX]
```

## Example Copy Behavior

```text
context-bridge --copy
```

This prints the `[CTX]` block to stdout and also copies the same block to the clipboard.

## Debug Example

```powershell
node .\bin\context-bridge.js --debug
```

Example stderr:

```text
[context-bridge] skipped mcp: spawn blocked
[context-bridge] skipped helper (installed): spawn blocked
[context-bridge] skipped helper (repo): spawn blocked
[context-bridge] selected time source: node
```

## Test Toggles

For local verification, these environment variables can force fallback behavior:

- `CONTEXT_BRIDGE_DISABLE_MCP=1`
- `CONTEXT_BRIDGE_DISABLE_HELPER=1`

Set both to `1` to force the pure Node fallback path.
