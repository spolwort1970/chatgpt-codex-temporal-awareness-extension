# Codex CLI Temporal Awareness

Windows Codex does not currently support native per-turn lifecycle hooks, so this folder uses the lightest practical fallback: a machine-global local time command plus a global Codex instruction that tells Codex to consult it on every turn.

## Current Approach

- The reusable helper lives in this repo under `codex-cli/time-helper/`.
- It should be installed to `C:\tools\time-helper\`.
- Codex should be configured globally to run `C:\tools\time-helper\current-time.cmd` before responding to every user turn.
- This avoids TUI mutation and avoids unsupported Windows hook behavior.

## Time Output

The command prints one line in this shape:

```text
[2026-03-29 12:34:56 PDT] (Pacific Daylight Time)
```

## Files

- `time-helper/current-time.ps1`: PowerShell time command
- `time-helper/current-time.cmd`: Windows shim for easier invocation
- `install-time-helper.ps1`: installs the helper to `C:\tools\time-helper` and updates Codex config
- `codex-timestamp.ps1`: older initial-prompt wrapper
- `codex-timestamp.cmd`: older initial-prompt wrapper shim

## Install

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

After installation, start `codex` normally from any repo and ask normal questions without prepending timestamps yourself.

## V1 Reality

- This is a working v1 for temporal grounding on Windows.
- In practice, Codex is now retrieving live local time before answering when prompted to do so.
- The current mechanism is instruction-driven, not hook-driven.
- That means Codex may sometimes use an equivalent local command such as `Get-Date` instead of the exact `C:\tools\time-helper\current-time.cmd` wrapper.
- Functionally, that still solves the core problem: Codex has current local time context for the turn.
- What it does not yet provide is deterministic enforcement of the exact helper path on every turn.

## Notes

- The `codex-timestamp.*` wrapper is kept for reference, but it only affects the initial launch prompt and is no longer the preferred approach.
- The installer targets `C:\tools\time-helper` so the same pattern can be recreated on other Windows machines.
- If stricter enforcement is needed later, the next architectural step is a first-class tool surface such as MCP rather than more prompt-wording tweaks.
