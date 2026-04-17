# MCP-to-Chat Context Bridge – Implementation Notes

## Purpose

Provide a practical implementation guide for building the MCP-to-Chat Context Bridge defined in `spec.md`.

This document is intentionally opinionated and pragmatic. It is designed for fast iteration, not overengineering.

---

## Recommended Stack

### Language
- Python (fastest to prototype, excellent CLI support)

### Libraries
- `argparse` (CLI)
- `subprocess` (for MCP CLI calls if needed)
- `json` (parsing tool output)
- `datetime` / `pytz` (time handling)
- `pyperclip` (clipboard support, optional)

---

## Project Structure

```
context-bridge/
│
├── main.py
├── collector.py
├── normalizer.py
├── formatter.py
├── transport.py
├── config.py
└── spec.md
```

---

## Core Components

### 1. Context Collector

**Responsibility:**
- Call MCP tools
- Gather raw data

Example (pseudo):

```python
def collect():
    return {
        "time.now": get_time(),
        "timezone": get_timezone(),
        "hostname": get_hostname(),
    }
```

---

### 2. Context Normalizer

**Responsibility:**
- Clean raw values
- Convert to simple types

Rules:
- Strings only (preferred)
- Lists for notes
- No nested dicts beyond 1 level

Example:

```python
def normalize(raw):
    return {
        "time.now": str(raw.get("time.now")),
        "timezone": raw.get("timezone", "unknown"),
    }
```

---

### 3. Context Formatter

**Responsibility:**
- Build `[CTX]` block

Example:

```python
def format_ctx(data):
    lines = []
    lines.append("[CTX]")
    lines.append(f"timestamp: {data['timestamp']}")
    lines.append("source: mcp-bridge")
    lines.append("version: 1")

    if "tools" in data:
        lines.append("tools:")
        for k, v in data["tools"].items():
            lines.append(f"  {k}: {v}")

    if "notes" in data:
        lines.append("notes:")
        for note in data["notes"]:
            lines.append(f"  - {note}")

    lines.append("[/CTX]")
    return "\n".join(lines)
```

---

### 4. Transport Layer

**Responsibility:**
- Output result

Options:

#### stdout
```python
print(ctx_block)
```

#### clipboard
```python
import pyperclip
pyperclip.copy(ctx_block)
```

---

## CLI Design

### Basic CLI

```bash
context-bridge
context-bridge --minimal
context-bridge --extended
context-bridge --copy
context-bridge --stdout
```

---

### argparse example

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--extended", action="store_true")
parser.add_argument("--copy", action="store_true")

args = parser.parse_args()
```

---

## Minimal Working Version (Phase 1)

Start with:

- timestamp (local)
- timezone
- source
- version
- 2–3 notes
- stdout output

Hardcode values if needed at first.

---

## Time Handling

### Local timestamp

```python
from datetime import datetime

timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
```

### ISO timestamp

```python
datetime.now().astimezone().isoformat()
```

---

## Notes Strategy

Keep notes simple and useful:

```python
notes = [
    "Timestamp is authoritative",
    "System configured",
]
```

Eventually allow dynamic injection.

---

## MCP Integration Strategy

### Option 1: Direct function calls
If MCP tools are exposed as Python functions.

### Option 2: CLI calls

```python
import subprocess

def get_time():
    result = subprocess.run(["mcp", "time"], capture_output=True, text=True)
    return result.stdout.strip()
```

---

## Error Handling

Rules:
- Never crash the whole block
- Skip missing fields
- Add note if important

Example:

```python
try:
    timezone = get_timezone()
except:
    timezone = "unknown"
```

---

## Performance

Not critical.

Guidelines:
- Keep runtime under 200ms
- Cache expensive calls if needed

---

## Future Enhancements

### Phase 2
- Clipboard support
- JSON output
- Configurable fields

### Phase 3
- Chrome extension integration
- Auto-injection
- Hotkey trigger

---

## Anti-Patterns

Avoid:

- dumping full MCP responses
- deeply nested JSON
- adding too many fields
- overcomplicating config early
- tight coupling to one MCP schema

---

## Example Output

```
[CTX]
timestamp: 2026-04-16 18:55:29 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T18:55:29-07:00
  timezone: America/Los_Angeles
notes:
  - Timestamp is authoritative
  - System stable
[/CTX]
```

---

## Final Guidance

Build this in layers:

1. Hardcoded prototype
2. Add real MCP calls
3. Add CLI options
4. Add clipboard
5. Add automation

Do NOT try to build everything at once.

---

## Key Principle

> Keep the bridge simple, predictable, and useful.

If it becomes noisy, you’ve gone too far.
