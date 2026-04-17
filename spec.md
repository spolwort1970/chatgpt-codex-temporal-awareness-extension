# MCP-to-Chat Context Bridge Spec

## Purpose

Create a lightweight utility that gathers selected MCP tool outputs and formats them into a compact, human-readable context block for paste or injection into chat interfaces that cannot directly access MCP tools.

This utility is **not** the MCP server itself. It is a bridge layer that consumes MCP-accessible data and emits a structured text block for models that only see prompt text.

Primary goal: reduce time blindness and missing environmental context in chat-based AI interfaces.

---

## Core Requirements

### Functional Goals

1. Collect selected context from available MCP-accessible utilities.
2. Format that context into a consistent text block.
3. Keep the output short, stable, and easy for an LLM to interpret.
4. Allow the block to be pasted manually into chat.
5. Support future auto-injection via browser extension or clipboard workflow.
6. Make the format extensible without breaking older parsers or prompts.

---

## Non-Goals

This utility should **not**:

- dump raw MCP responses verbatim
- include unnecessary telemetry
- include large JSON blobs unless explicitly requested
- attempt to expose every MCP tool
- create a complicated schema before it is needed
- assume the receiving model can parse strict JSON reliably in normal chat

---

## Output Format

The bridge must output a structured plain-text block using a simple tagged format.

Preferred wrapper:

```text
[CTX]
timestamp: 2026-04-16 18:55:29 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T18:55:29-07:00
  timezone: America/Los_Angeles
notes:
  - Crosshair configured
  - Vector repurposed
[/CTX]
```

### Format Rules

- Must begin with `[CTX]`
- Must end with `[/CTX]`
- Use simple key/value lines where possible
- Use indented list items for collections
- Avoid nested complexity beyond one indentation level unless necessary
- Preserve stable field ordering
- Omit empty sections rather than printing placeholders

---

## Minimum Required Fields

These fields must be present in every emitted context block:

- `timestamp`
- `source`
- `version`

### Definitions

#### `timestamp`
Human-readable current local timestamp intended for direct chat visibility.

Example:
```text
timestamp: 2026-04-16 18:55:29 PDT
```

#### `source`
Identifier of the bridge utility.

Example:
```text
source: mcp-bridge
```

#### `version`
Schema version for the context block format.

Example:
```text
version: 1
```

---

## Optional Sections

These sections may be included when relevant.

### `tools`
Key MCP-derived values that are useful to the model.

Example:
```text
tools:
  time.now: 2026-04-16T18:55:29-07:00
  timezone: America/Los_Angeles
  hostname: MSI_Crossfire
```

Rules:
- only include high-signal fields
- do not include raw diagnostic clutter
- prefer flat keys over nested structures

### `notes`
Short human-readable bullets summarizing important state.

Example:
```text
notes:
  - Crosshair configured and stable
  - Vector now standalone
  - Waiting on USB-C to DisplayPort cable
```

Rules:
- max 3 to 7 bullets
- each bullet should be short
- no essays

### `flags`
Boolean-style conditions that may affect reasoning.

Example:
```text
flags:
  - timestamp_authoritative
  - user_local_time_verified
  - mcp_data_current
```

### `session`
Compact session context if needed.

Example:
```text
session:
  id: local-dev-session
  mode: troubleshooting
```

---

## Data Prioritization

The bridge should prioritize the following classes of information:

### Tier 1: Always Useful
- current timestamp
- timezone
- machine name / hostname
- high-level state notes

### Tier 2: Sometimes Useful
- active project name
- current workflow stage
- last completed action
- last known tool result summary

### Tier 3: Use Sparingly
- uptime
- active window title
- current git branch
- shell cwd
- selected environment metadata

Only include Tier 3 fields if they are directly relevant to the current task.

---

## Compression Rules

The bridge must keep output compact.

### Hard Guidelines
- target output length: under 25 lines
- ideal output length: 8 to 15 lines
- do not include more than 7 notes
- do not include more than 10 tool fields
- collapse or omit low-value data

### Example of bad output
- huge JSON payloads
- full MCP response objects
- repeated timestamps in multiple formats without need
- internal debugging logs

---

## Extensibility

The format must be forward-compatible.

### Rules
- new sections can be added later
- old required fields must remain stable
- unknown sections should be safely ignorable
- consumers should not depend on rigid positional parsing beyond wrapper tags and key labels

---

## Suggested Tool Inputs

The first version should support values from tools like:

- `time.now`
- `time.timezone`
- `system.hostname`
- `system.platform`
- `project.current`
- `session.mode`
- `notes.current`

These names are conceptual. Actual MCP tool names may differ.

---

## Recommended Internal Architecture

### Components

#### 1. Context Collector
Responsible for querying selected MCP tools and gathering raw values.

#### 2. Context Normalizer
Converts raw MCP outputs into stable scalar values or short lists.

#### 3. Context Formatter
Builds the final `[CTX] ... [/CTX]` block.

#### 4. Transport Layer
Optional. Handles:
- clipboard copy
- stdout output
- file write
- browser extension handoff

---

## Error Handling

If a tool is unavailable, do not fail the whole block.

Instead:
- omit the field
- optionally add a short note if the missing field matters

Example:
```text
notes:
  - timezone unavailable from MCP; using local fallback
```

Do not print stack traces into the context block.

---

## Modes

Implement at least two output modes.

### 1. Minimal Mode
For ordinary chats.

Example fields:
- timestamp
- source
- version
- tools: time.now, timezone
- notes

### 2. Extended Mode
For more technical debugging.

May additionally include:
- hostname
- session mode
- current project
- branch
- current working directory

Use Extended Mode only when requested.

---

## CLI Behavior

If built as a CLI utility, support something like:

```bash
context-bridge
context-bridge --minimal
context-bridge --extended
context-bridge --copy
context-bridge --stdout
context-bridge --json
```

### Behavior
- default mode should be `--minimal`
- `--copy` copies formatted block to clipboard
- `--stdout` prints formatted block
- `--json` is optional for machine consumption, but plain-text output remains primary

---

## JSON Support (Optional)

The bridge may also support JSON output for automation, but the primary human-facing format is the tagged text block.

Example JSON:

```json
{
  "timestamp": "2026-04-16 18:55:29 PDT",
  "source": "mcp-bridge",
  "version": 1,
  "tools": {
    "time.now": "2026-04-16T18:55:29-07:00",
    "timezone": "America/Los_Angeles"
  },
  "notes": [
    "Crosshair configured",
    "Vector repurposed"
  ]
}
```

---

## Acceptance Criteria

The utility is acceptable when:

1. It can generate a valid `[CTX]` block on demand.
2. The block is easy to read in plain chat.
3. The block includes authoritative time context.
4. The output remains short and consistent.
5. The utility degrades gracefully if some MCP tools fail.
6. A receiving LLM can use the block without needing custom parsing logic.

---

## Example Minimal Output

```text
[CTX]
timestamp: 2026-04-16 18:55:29 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T18:55:29-07:00
  timezone: America/Los_Angeles
notes:
  - Timestamp is authoritative
  - User is working on laptop migration
[/CTX]
```

---

## Example Extended Output

```text
[CTX]
timestamp: 2026-04-16 18:55:29 PDT
source: mcp-bridge
version: 1
tools:
  time.now: 2026-04-16T18:55:29-07:00
  timezone: America/Los_Angeles
  hostname: MSI_Crossfire
  platform: windows
  project.current: laptop-migration
session:
  id: local-session
  mode: troubleshooting
flags:
  - timestamp_authoritative
  - mcp_data_current
notes:
  - Crosshair configured and stable
  - Vector now standalone
  - Dell secondary NVMe moved successfully
[/CTX]
```

---

## Guidance for Implementation

Build the smallest working version first.

### Phase 1
- timestamp
- timezone
- source
- version
- notes
- stdout output

### Phase 2
- clipboard support
- minimal vs extended modes
- optional JSON output

### Phase 3
- browser extension integration
- auto-injection support
- configurable field selection

Do not overengineer Phase 1.

---

## Final Instruction to Implementer

Prioritize:
- consistency
- readability
- low noise
- low friction

The bridge should make context more useful, not more complicated.
