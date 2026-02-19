# Claude Code Hook Events Reference

## Data Passing Mechanism

Hook data is passed via **stdin as JSON**, not environment variables.

### Available Environment Variables

Only these environment variables are available in all hook commands:

| Variable | Description |
|----------|-------------|
| `$CLAUDE_PROJECT_DIR` | Project root directory |
| `$CLAUDE_PLUGIN_ROOT` | Plugin root directory (for plugin hooks) |
| `$CLAUDE_CODE_REMOTE` | `"true"` when running in remote web environment |

### Common stdin JSON Fields (All Events)

```json
{
  "session_id": "string",
  "transcript_path": "/path/to/conversation.json",
  "cwd": "/current/working/directory",
  "permission_mode": "string",
  "hook_event_name": "Stop | Notification | PreToolUse | PostToolUse"
}
```

## Event-Specific stdin Fields

### Stop

Fired when Claude finishes a response turn.

| Field | Type | Description |
|-------|------|-------------|
| `stop_hook_active` | boolean | Whether a Stop hook is already continuing |
| `last_assistant_message` | string | Claude's final response text |

```bash
# Extract last message from Stop event
MSG=$(cat - | jq -r '.last_assistant_message // empty')
```

### Notification

Fired when Claude generates an internal notification (permission prompts, idle alerts, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Notification text |
| `title` | string (optional) | Notification title |
| `notification_type` | string | One of: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` |

**Important**: stdin can only be read once. Store in a variable first:

```bash
# Correct: read stdin once, then extract fields
INPUT=$(cat -)
MSG=$(printf '%s' "$INPUT" | jq -r '.message // empty')
TITLE=$(printf '%s' "$INPUT" | jq -r '.title // empty')
TYPE=$(printf '%s' "$INPUT" | jq -r '.notification_type // empty')
```

### PreToolUse

Fired before a tool is executed. Can block tool execution.

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Tool name (e.g., "Bash", "Write", "Edit") |
| `tool_input` | object | Tool input parameters |
| `tool_use_id` | string | Unique tool use ID |

```bash
# Check which tool is being used
TOOL=$(cat - | jq -r '.tool_name // empty')
```

### PostToolUse

Fired after a tool finishes execution.

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Tool name |
| `tool_input` | object | Tool input parameters |
| `tool_response` | string | Tool execution result |
| `tool_use_id` | string | Unique tool use ID |

```bash
# Get tool result
RESULT=$(cat - | jq -r '.tool_response // empty')
```

## Patterns for Notification Integration

### Stop Hook (Most Common)

Send a notification when Claude finishes a task. No stdin parsing needed for basic use:

```bash
<NOTIFY_TOOLS_DIR>/scripts/notify.sh \
  "$(basename "$CLAUDE_PROJECT_DIR")" \
  "Task completed" \
  "info" \
  "{\"project\":\"$CLAUDE_PROJECT_DIR\"}"
```

### Notification Hook with stdin Parsing

Forward Claude's internal notifications to the notification server:

```bash
MSG=$(cat - | jq -r '.message // empty') && \
  [ -n "$MSG" ] && \
  <NOTIFY_TOOLS_DIR>/scripts/notify.sh \
    "$(basename "$CLAUDE_PROJECT_DIR")" \
    "$MSG" \
    "info" \
    "{\"project\":\"$CLAUDE_PROJECT_DIR\"}"
```

### Stop Hook with Last Message

Include Claude's last response summary in the notification:

```bash
INPUT=$(cat -)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // "Task completed"' | head -c 200)
<NOTIFY_TOOLS_DIR>/scripts/notify.sh \
  "$(basename "$CLAUDE_PROJECT_DIR")" \
  "$LAST_MSG" \
  "info" \
  "{\"project\":\"$CLAUDE_PROJECT_DIR\"}"
```
