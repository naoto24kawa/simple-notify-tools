---
name: notify-setup
description: This skill should be used when the user asks to "setup notifications", "integrate notify", "add notification hooks", "connect to notification server", "notify setup", "configure notify hooks", "add Stop hook", "add Notification hook", "セットアップ", "通知の導入", "他のプロジェクトに導入", "通知を設定", "hookを追加", "入力待ち通知", "ask通知", or needs to configure Claude Code hooks to send notifications to the simple-notify-tools server.
---

# Notification Setup Skill

Claude Code の hook を設定し、通知サーバーへ通知を送る。

## Skill Base Directory

This skill bundles `scripts/notify.sh`. Resolve the absolute path from this skill's base directory.

```
<SKILL_BASE_DIR>/scripts/notify.sh
```

## How notify.sh Works

`notify.sh` is a hook-dedicated script. It reads stdin JSON from Claude Code hook events, extracts the relevant message, and sends a notification to the server. No arguments are needed.

Supported events:
- **Stop** - extracts `last_assistant_message` (most common)
- **Notification** - extracts `message` and `title`
- **PreToolUse / PostToolUse** - logged only, no notification sent

## Execution Steps

Execute these steps in order:

### Step 1: Verify Prerequisites

**Required tools:** `curl`, `jq` (notify.sh depends on jq for JSON parsing)

```bash
command -v jq >/dev/null 2>&1 && echo "jq: OK" || echo "jq: MISSING - install with 'brew install jq' or 'apt install jq'"
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

### Step 3: Ask Which Hooks to Enable

Ask the user which hooks to enable via AskUserQuestion:

| Hook | Description |
|------|-------------|
| **Stop** (default) | タスク完了時に通知 |
| **Notification** | 入力待ち(permission prompt, idle, AskUserQuestion)時に通知 |

**Question example:**
- "どのタイミングで通知を受け取りたいですか?"
- Options:
  1. "Stop のみ (タスク完了時)" - default, most common
  2. "Stop + Notification (タスク完了 + 入力待ち)" - recommended for unattended operation
  3. "Notification のみ (入力待ちのみ)" - for users who only care about prompts

### Step 4: Write Hook to settings.json

Add selected hooks to `<TARGET_PROJECT>/.claude/settings.json`.

**Hook command template:**
```
<NOTIFY_SH_PATH>
```

That's it. `notify.sh` reads stdin JSON automatically and extracts the message.

**Single hook block pattern** (same structure for each event type):
```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "<NOTIFY_SH_PATH>"
    }
  ]
}
```

Add this block under each selected event key (`Stop`, `Notification`) in the `hooks` object. Replace `<NOTIFY_SH_PATH>` with the absolute path resolved in Step 2.

See `examples/per-project-settings.json` for a complete Stop + Notification configuration. For LAN access, see `examples/lan-access-settings.json`.

**Important**: If `.claude/settings.json` already has hooks, merge the new hooks into the existing `hooks` object. Do not overwrite other hooks.

### Step 5: Test

Send test notifications for each enabled hook:

**Stop event:**
```bash
echo '{"hook_event_name":"Stop","last_assistant_message":"Setup test - notification working"}' | \
  CLAUDE_PROJECT_DIR="$PWD" <NOTIFY_SH_PATH>
```

**Notification event (if enabled):**
```bash
echo '{"hook_event_name":"Notification","message":"Permission needed","title":"Tool approval","notification_type":"permission_prompt"}' | \
  CLAUDE_PROJECT_DIR="$PWD" <NOTIFY_SH_PATH>
```

Confirm the notifications appear on the dashboard at `http://<HOST>:23000`.

## LAN Access

For notifications across machines, prepend `NOTIFY_HOST=<IP>` to the hook command:

```
NOTIFY_HOST=192.168.1.100 <NOTIFY_SH_PATH>
```

### notify.sh Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_HOST` | localhost | Server hostname or IP |
| `NOTIFY_PORT` | 23000 | Server port |
| `NOTIFY_LOG` | /tmp/notify-hook.log | Log file path |

## Available Hook Events

| Event | Use Case | stdin Data |
|-------|----------|------------|
| `Stop` | Task completion notification (most common) | `last_assistant_message` |
| `Notification` | Claude's internal notification messages | `message`, `title`, `notification_type` |
| `PreToolUse` | Logged only (no notification) | `tool_name`, `tool_input` |
| `PostToolUse` | Logged only (no notification) | `tool_name`, `tool_response` |

Hook event data is passed via **stdin as JSON**. Only `$CLAUDE_PROJECT_DIR` is available as an env var.

For detailed per-event stdin fields, see `references/hook-events.md`.

## Additional Resources

- **`references/api-reference.md`** - API endpoints, request/response formats, notify.sh reference
- **`references/hook-events.md`** - Per-event stdin JSON fields and integration patterns
- **`references/ai-summarization.md`** - AI message summarization setup (`ANTHROPIC_API_KEY`)
- **`examples/`** - Working hook configuration examples
