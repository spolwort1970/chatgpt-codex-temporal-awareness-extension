# ChatGPT And Codex CLI Timeblindness Cure

This repository holds two separate implementations of the same idea: add local temporal context so prompts are grounded in the user's current time.

## Layout

- `chatgpt-extension/`: Chrome extension for ChatGPT web
- `codex-cli/`: Codex CLI version

## Current Status

- `chatgpt-extension/` is implemented and working.
- `codex-cli/` now has a working v1 fallback: a reusable Windows time helper plus installer for machine-global temporal awareness.
- `codex-cli/` also now has a working v2 path: a minimal MCP time server that exposes a first-class `current_time` tool inside Codex.
- The MCP path is now the preferred Codex CLI integration because Codex can call the dedicated tool directly instead of improvising with generic shell commands.
- The instruction-driven helper remains useful as a fallback on Windows, but it does not strictly guarantee use of the exact helper command on every turn.

## Next Steps

- Load and use the ChatGPT extension from `chatgpt-extension/`.
- For Codex CLI, prefer the MCP setup in `codex-cli/mcp-time-server/`.
- Keep the `C:\tools\time-helper` installer path available as a Windows fallback.
- Treat the current Codex CLI behavior as a layered solution: MCP first, instruction-driven helper second.
