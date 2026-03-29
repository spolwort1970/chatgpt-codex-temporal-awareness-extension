# Codex CLI Temporal Awareness

Windows Codex does not currently support native per-turn lifecycle hooks, so this folder now uses a layered approach:

- preferred: a local MCP server that exposes a first-class `current_time` tool
- fallback: a machine-global local time command plus a global Codex instruction

## Time Output

The command prints one line in this shape:

```text
[2026-03-29 12:34:56 PDT] (Pacific Daylight Time)
```

## Files

- `time-helper/current-time.ps1`: PowerShell time command
- `time-helper/current-time.cmd`: Windows shim for easier invocation
- `install-time-helper.ps1`: installs the helper to `C:\tools\time-helper` and updates Codex config
- `mcp-time-server/`: minimal Node-based MCP server that exposes a `current_time` tool
- `codex-timestamp.ps1`: older initial-prompt wrapper
- `codex-timestamp.cmd`: older initial-prompt wrapper shim

## Preferred Path: MCP

Codex config snippet:

```toml
[mcp_servers.time_helper]
command = "node"
args = ["C:\\Github\\chatgpt-codex-temporal-awareness-extension\\codex-cli\\mcp-time-server\\server.js"]
```

What works now:

- Codex starts the server successfully.
- The server exposes the `current_time` MCP tool.
- Codex can discover and call that tool.
- The first tool use may prompt for approval. If you trust it, choose `Always allow`.

Recommended test:

```text
Use the current_time tool and return its exact output.
```

Expected shape:

```text
[2026-03-29 13:44:08 PDT] (Pacific Daylight Time)
```

## Fallback Path: Local Helper

If you want a Windows-native fallback when MCP is not available, install the local helper:

```powershell
cd C:\Github\chatgpt-codex-temporal-awareness-extension
.\codex-cli\install-time-helper.ps1
```

This creates:

```text
C:\tools\time-helper\
  current-time.cmd
  current-time.ps1
```

and updates your global Codex config to reference `C:\tools\time-helper\current-time.cmd`.

## Recommended Usage

- Prefer the MCP server when you want a first-class time tool inside Codex.
- Keep the local helper installed as fallback on Windows.
- Start `codex` normally from any repo and ask normal questions without prepending timestamps yourself.

## Notes

- The `codex-timestamp.*` wrapper is kept for reference, but it only affects the initial launch prompt and is no longer the preferred approach.
- The installer targets `C:\tools\time-helper` so the same pattern can be recreated on other Windows machines.
- MCP is now the preferred path because it gives Codex a dedicated `current_time` tool instead of relying on prompt steering.
- The local helper remains useful because it is simple, portable, and works even when MCP is not configured.
