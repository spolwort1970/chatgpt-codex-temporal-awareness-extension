# ChatGPT Prompt Timestamp

Lightweight Chrome extension that prepends a local timestamp and optional localhost-fetched `[CTX]` block to each ChatGPT prompt immediately before submission.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chatgpt-extension` folder in this repository.
5. After loading or reloading the extension, refresh any open ChatGPT tab so the content script is injected into the page.

## Behavior

Before a prompt is sent, the extension rewrites it to this format:

```text
[YYYY-MM-DD HH:mm:ss z]

[CTX]
...
[/CTX]

Original prompt text...
```

The original prompt body is left unchanged, including multiline content. The extension checks near the top of the prompt body to avoid duplicate timestamp or `[CTX]` prepends on retries, resends, or edits.

Supported send behavior:

- `Enter`: prepends the timestamp and sends the message.
- `Shift+Enter`: inserts a newline only. It does not prepend or send.
- Mouse click on the send button: prepends the timestamp and sends the message.

If the localhost bridge is unavailable, times out, or returns invalid data, the extension fails open and the normal send continues.

## Localhost Bridge

Automatic context injection depends on the local API wrapper:

```powershell
cd C:\github\chatgpt-codex-temporal-awareness-extension\codex-cli\context-bridge-server
node .\server.js
```

Default endpoint:

```text
http://127.0.0.1:4317/context?mode=minimal
```

The extension fetches this immediately before send and prepends the returned `contextBlock` when available.

## Settings

Open the extension options page to configure:

- auto-inject localhost context
- keep single-line timestamp
- context mode: minimal or extended

## Files

- `manifest.json`: Manifest V3 configuration.
- `options.html`: basic extension settings page.
- `src/content.js`: Initializes submission listeners.
- `src/context-client.js`: Fetches the localhost context block with a short timeout.
- `src/dom.js`: Finds the composer and submit triggers.
- `src/inject.js`: Handles near-top dedupe and prompt rewriting.
- `src/settings.js`: Reads and writes extension settings.
- `src/time.js`: Generates the local timestamp string.

## Notes

- Targets ChatGPT on `chatgpt.com` and `chat.openai.com`.
- Supports Enter-to-send and clicking the send button via an async fail-open send path.
- Uses a cached active composer so send-button clicks still stamp reliably after focus shifts away from the editor.
- Requires the localhost bridge server for automatic `[CTX]` injection.
- Fails safely if ChatGPT changes its DOM structure or the bridge is unavailable.
