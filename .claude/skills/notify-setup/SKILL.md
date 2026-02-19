---
name: notify-setup
description: This skill should be used when the user asks to "setup notifications", "integrate notify", "add notification hooks", "connect to notification server", "notify setup", "configure notify hooks", "add Stop hook", "セットアップ", "通知の導入", "他のプロジェクトに導入", "通知を設定", "hookを追加", or needs to configure Claude Code hooks to send notifications to the simple-notify-tools server.
---

# Notification Setup Skill

Claude Code の Stop hook を設定し、タスク完了時に通知サーバーへ通知を送る。

## Skill Base Directory

This skill bundles `scripts/notify.sh`. Resolve the absolute path from this skill's base directory.

```
<SKILL_BASE_DIR>/scripts/notify.sh
```

## Execution Steps

Claude MUST execute these steps in order:

### Step 1: Verify Server

```bash
curl -sf http://<HOST>:23000/api/health
```

- Default HOST is `localhost`.
- If the server is not running, ask the user to start it or provide the host/port.

### Step 2: Resolve notify.sh Path

The script is bundled at `<SKILL_BASE_DIR>/scripts/notify.sh`.
Use the absolute path provided by "Base directory for this skill" context.

Example: If base directory is `/home/user/simple-notify-tools/.claude/skills/notify-setup`, then:
```
/home/user/simple-notify-tools/.claude/skills/notify-setup/scripts/notify.sh
```

Verify the script exists and is executable:
```bash
test -x <SKILL_BASE_DIR>/scripts/notify.sh && echo "OK"
```

### Step 3: Write Hook to settings.json

Add a `Stop` hook to `<TARGET_PROJECT>/.claude/settings.json`.

The hook reads `last_assistant_message` from stdin and sends it as the notification body (first 200 chars).

**Hook command template:**
```
INPUT=$(cat -) && LAST_MSG=$(printf '%s' "$INPUT" | jq -r '.last_assistant_message // "Task completed"' 2>/dev/null | tr -d '\\000-\\037' | head -c 200) && <NOTIFY_SH_PATH> "$(basename "$CLAUDE_PROJECT_DIR")" "${LAST_MSG:-Task completed}"
```

**Full settings.json snippet:**
```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat -) && LAST_MSG=$(echo \"$INPUT\" | jq -r '.last_assistant_message // \"Task completed\"' | head -c 200) && <NOTIFY_SH_PATH> \"$(basename \"$CLAUDE_PROJECT_DIR\")\" \"$LAST_MSG\""
          }
        ]
      }
    ]
  }
}
```

Replace `<NOTIFY_SH_PATH>` with the absolute path resolved in Step 2.

**Important**: If `.claude/settings.json` already has hooks, merge the Stop hook into the existing `hooks` object. Do not overwrite other hooks.

### Step 4: Test

Send a test notification:
```bash
<NOTIFY_SH_PATH> "$(basename "$PWD")" "Setup test - notification working"
```

Confirm the notification appears on the dashboard at `http://<HOST>:23000`.

## LAN Access

For notifications across machines, prepend `NOTIFY_HOST=<IP>` to the hook command:

```
INPUT=$(cat -) && LAST_MSG=$(printf '%s' "$INPUT" | jq -r '.last_assistant_message // "Task completed"' 2>/dev/null | tr -d '\\000-\\037' | head -c 200) && NOTIFY_HOST=192.168.1.100 <NOTIFY_SH_PATH> "$(basename "$CLAUDE_PROJECT_DIR")" "${LAST_MSG:-Task completed}"
```

### notify.sh Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_HOST` | localhost | Server hostname or IP |
| `NOTIFY_PORT` | 23000 | Server port |

## Available Hook Events

| Event | Use Case | stdin Data |
|-------|----------|------------|
| `Stop` | Task completion notification (most common) | `last_assistant_message` |
| `Notification` | Claude's internal notification messages | `message`, `title`, `notification_type` |
| `PreToolUse` | Notify when waiting for user confirmation | `tool_name`, `tool_input` |
| `PostToolUse` | Notify on long-running tool completion | `tool_name`, `tool_response` |

Hook event data is passed via **stdin as JSON**. Only `$CLAUDE_PROJECT_DIR` is available as an env var.

For detailed per-event stdin fields, see `references/hook-events.md`.

## Additional Resources

- **`references/api-reference.md`** - API endpoints, request/response formats, notify.sh CLI
- **`references/hook-events.md`** - Per-event stdin JSON fields and parsing patterns
- **`examples/`** - Working hook configuration examples
