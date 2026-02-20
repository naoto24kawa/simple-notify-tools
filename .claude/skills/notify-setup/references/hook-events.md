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

### Notification

Fired when Claude generates an internal notification (permission prompts, idle alerts, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Notification text |
| `title` | string (optional) | Notification title |
| `notification_type` | string | One of: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog` |

### PreToolUse

Fired before a tool is executed. Can block tool execution.

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Tool name (e.g., "Bash", "Write", "Edit") |
| `tool_input` | object | Tool input parameters |
| `tool_use_id` | string | Unique tool use ID |

### PostToolUse

Fired after a tool finishes execution.

| Field | Type | Description |
|-------|------|-------------|
| `tool_name` | string | Tool name |
| `tool_input` | object | Tool input parameters |
| `tool_response` | string | Tool execution result |
| `tool_use_id` | string | Unique tool use ID |

## Integration with notify.sh

`notify.sh` is a hook-dedicated script that handles all stdin parsing internally. Just set it as the hook command:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "<NOTIFY_SH_PATH>"
          }
        ]
      }
    ]
  }
}
```

### How notify.sh Handles Each Event

| Event | Behavior | Category |
|-------|----------|----------|
| **Stop** | Extracts `last_assistant_message`, sanitizes (200 char limit), sends as notification | `complete` |
| **Notification** | Extracts `title` and `message`, combines them, sends as notification | `action_required` |
| **PreToolUse** | Logs the event, exits without sending notification | - |
| **PostToolUse** | Logs the event, exits without sending notification | - |
| **Unknown** | Sends fallback message "Hook event: <event_name>" | `info` |

### LAN Access

For notifications across machines:

```json
{
  "command": "NOTIFY_HOST=192.168.1.100 <NOTIFY_SH_PATH>"
}
```

### Manual Testing

```bash
# Stop event
echo '{"hook_event_name":"Stop","last_assistant_message":"Hello world"}' | \
  CLAUDE_PROJECT_DIR=/tmp/test-project <NOTIFY_SH_PATH>

# Notification event
echo '{"hook_event_name":"Notification","message":"Permission needed","title":"Auth"}' | \
  CLAUDE_PROJECT_DIR=/tmp/test-project <NOTIFY_SH_PATH>

# Empty stdin (fallback)
echo '' | CLAUDE_PROJECT_DIR=/tmp/test <NOTIFY_SH_PATH>
```
