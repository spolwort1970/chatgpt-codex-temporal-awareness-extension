# ChatGPT Prompt Timestamp

Lightweight Chrome extension that prepends a local timestamp to each ChatGPT prompt immediately before submission.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `chatgpt-extension` folder in this repository.
5. After loading or reloading the extension, refresh any open ChatGPT tab so the content script is injected into the page.

## Behavior

Before a prompt is sent, the extension rewrites it to this format:

```text
[Current local timestamp: YYYY-MM-DD HH:mm:ss z (IANA_Timezone)]

Original prompt text...
```

The original prompt body is left unchanged, including multiline content. If the message already starts with the timestamp prefix, the extension does not inject a second one.

Supported send behavior:

- `Enter`: prepends the timestamp and sends the message.
- `Shift+Enter`: inserts a newline only. It does not prepend or send.
- Mouse click on the send button: prepends the timestamp and sends the message.

## Files

- `manifest.json`: Manifest V3 configuration.
- `src/content.js`: Initializes submission listeners.
- `src/dom.js`: Finds the composer and submit triggers.
- `src/time.js`: Generates the local timestamp string.
- `src/inject.js`: Handles dedupe and prompt rewriting.

## Notes

- Targets ChatGPT on `chatgpt.com` and `chat.openai.com`.
- Supports Enter-to-send and clicking the send button.
- Uses a cached active composer so send-button clicks still stamp reliably after focus shifts away from the editor.
- Fails safely if ChatGPT changes its DOM structure.
