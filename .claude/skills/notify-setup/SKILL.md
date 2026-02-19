---
name: notify-setup
description: This skill should be used when the user asks to "setup notifications", "integrate notify", "add notification hooks", "connect to notification server", "notify setup", "configure notify hooks", "add Stop hook", "セットアップ", "通知の導入", "他のプロジェクトに導入", "通知を設定", "hookを追加", or needs to configure Claude Code hooks to send notifications to the simple-notify-tools server.
---

# Notification Setup Guide

Integrate the simple-notify-tools notification server into any Claude Code project via hooks.

## Prerequisites

- The notification server (simple-notify-tools) is running
- The target project uses Claude Code

## Quick Start

### 1. Verify Server

Confirm the notification server is reachable:

```bash
curl -sf http://<HOST>:23000/api/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

Default host is `localhost`. For LAN access, use the server machine's IP address.

### 2. Choose Integration Method

| Method | Pros | Cons |
|--------|------|------|
| **notify.sh** (Recommended) | Cleaner config, environment variable support, error handling | Requires path to simple-notify-tools |
| **curl direct** | No external dependency | Longer command, inline JSON escaping |

### 3. Choose Scope

| Scope | File | Effect |
|-------|------|--------|
| Per-project | `<project>/.claude/settings.json` | Only this project sends notifications |
| Global | `~/.claude/settings.json` | All projects send notifications |

The hook uses `$(basename "$CLAUDE_PROJECT_DIR")` as the notification title, so each project is identifiable even with a single global hook.

### 4. Add Hook Configuration

#### Method A: notify.sh (Recommended)

Add a `Stop` hook to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "<NOTIFY_TOOLS_DIR>/scripts/notify.sh \"$(basename \"$CLAUDE_PROJECT_DIR\")\" \"Task completed\" \"info\" \"{\\\"project\\\":\\\"$CLAUDE_PROJECT_DIR\\\"}\""
          }
        ]
      }
    ]
  }
}
```

Replace `<NOTIFY_TOOLS_DIR>` with the absolute path to the simple-notify-tools directory (e.g., `/home/user/simple-notify-tools`).

#### Method B: curl Direct (No dependency)

Add a `Stop` hook using curl directly:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "curl -sf -X POST http://localhost:23000/api/notify -H 'Content-Type: application/json' -d \"{\\\"title\\\":\\\"$(basename \"$CLAUDE_PROJECT_DIR\")\\\",\\\"message\\\":\\\"Task completed\\\",\\\"category\\\":\\\"info\\\",\\\"metadata\\\":{\\\"project\\\":\\\"$CLAUDE_PROJECT_DIR\\\"}}\""
          }
        ]
      }
    ]
  }
}
```

### 5. Verify

Trigger a `Stop` event and check the notification dashboard at `http://<HOST>:23000`.

## LAN Access

For notifications across machines, set `NOTIFY_HOST` to the server's IP:

```json
{
  "type": "command",
  "command": "NOTIFY_HOST=192.168.1.100 <NOTIFY_TOOLS_DIR>/scripts/notify.sh \"$(basename \"$CLAUDE_PROJECT_DIR\")\" \"Task completed\" \"info\" \"{\\\"project\\\":\\\"$CLAUDE_PROJECT_DIR\\\"}\""
}
```

Environment variables for notify.sh:

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

**Important**: Hook event data is passed via **stdin as JSON**, not environment variables. Only `$CLAUDE_PROJECT_DIR` is available as an env var. To read event data, parse stdin with `jq`:

```bash
# Example: extract message from Notification event
MSG=$(cat - | jq -r '.message // empty')
```

For detailed per-event stdin fields and patterns, consult `references/hook-events.md`.

## Setup Checklist

1. Verify server is running: `curl -sf http://localhost:23000/api/health`
2. Choose integration method (notify.sh or curl)
3. Choose scope (global or per-project)
4. Add hook to `.claude/settings.json`
5. Test: trigger a `Stop` event and check the dashboard

## Additional Resources

### Reference Files

- **`references/api-reference.md`** - Full API endpoints, request/response formats, notify.sh CLI reference
- **`references/hook-events.md`** - Detailed per-event stdin JSON fields, parsing patterns, integration examples

### Example Files

Working hook configurations in `examples/`:
- **`per-project-settings.json`** - Per-project hook using notify.sh (place at `<project>/.claude/settings.json`)
- **`global-settings.json`** - Global hook with multiple events (place at `~/.claude/settings.json`)
- **`curl-direct-settings.json`** - Hook using curl directly, no dependency (place at either location)
- **`lan-access-settings.json`** - LAN access with NOTIFY_HOST
