# ChatGPT And Codex CLI Timeblindness Cure

This repository holds two separate implementations of the same idea: add local temporal context so prompts are grounded in the user's current time.

## Layout

- `chatgpt-extension/`: Chrome extension for ChatGPT web
- `codex-cli/`: Codex CLI version

## Current Status

- `chatgpt-extension/` is implemented and working.
- `codex-cli/` now has a working v1: a reusable Windows time helper plus installer for machine-global temporal awareness.
- The Codex CLI solution is instruction-driven rather than hook-driven, so it solves the functional time-awareness problem but does not yet guarantee strict use of the exact helper command on every turn.

## Next Steps

- Load and use the ChatGPT extension from `chatgpt-extension/`.
- Install the Codex CLI helper from `codex-cli/` to `C:\tools\time-helper`.
- Configure Codex globally to use that helper for local temporal context on Windows.
- Treat the current Codex CLI behavior as v1: good enough for practical temporal grounding, with stricter enforcement deferred to a future iteration.
