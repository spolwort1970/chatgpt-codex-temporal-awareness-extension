# Repo Instructions

This repository exists to configure temporal awareness for ChatGPT and Codex CLI.

## If The User Says "Pull The Latest And Update"

Do this exact workflow unless the user asks for something different:

1. Run `git pull --ff-only` at the repo root.
2. Run `.\update-this-machine.ps1`.
3. Tell the user to start a brand-new `codex` session after the update completes.

Do not stop after `git pull`. The machine-level Codex install step is part of "update" for this repo.

## Codex CLI Intent

For this repo, "temporal utilities" refers to the MCP tools exposed by `codex-cli\mcp-time-server\server.js`, not to MCP resources or templates.

If `time_helper.current_time` or the other `time_helper` tools are callable, then the temporal MCP server is available in the session.

Empty results from MCP resource or resource-template listing do not mean the temporal server is missing, because this server is tool-only.
