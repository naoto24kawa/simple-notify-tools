---
name: notify-setup
description: This skill should be used when the user asks to "setup notifications", "integrate notify", "add notification hooks", "connect to notification server", "notify setup", "configure notify hooks", "add Stop hook", "add Notification hook", "セットアップ", "通知の導入", "他のプロジェクトに導入", "通知を設定", "hookを追加", "入力待ち通知", "ask通知", or needs to configure Claude Code hooks to send notifications to the simple-notify-tools server.
---

# Notification Setup Skill

Configure Claude Code hooks to send notifications to the simple-notify-tools server.

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
command -v curl >/dev/null 2>&1 && echo "curl: OK" || echo "curl: MISSING"
command -v jq >/dev/null 2>&1 && echo "jq: OK" || echo "jq: MISSING - install with 'brew install jq' or 'apt install jq'"
curl -sf http://<HOST>:23000/api/health
```

- Default HOST is `localhost`.
- If the server is not running, prompt the user to start it or provide the host/port.

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

Prompt the user which hooks to enable via AskUserQuestion:

| Hook | Description |
|------|-------------|
| **Stop** (default) | Notifies on task completion |
| **Notification** | Notifies on input prompts (permission prompt, idle, AskUserQuestion) |

**Question example:**
- "どのタイミングで通知を受け取りたいですか?"
- Options:
  1. "Stop のみ (タスク完了時)" - default, most common
  2. "Stop + Notification (タスク完了 + 入力待ち)" - recommended for unattended operation
  3. "Notification のみ (入力待ちのみ)" - for users who only care about prompts

### Step 4: Ask Configuration Level

Prompt the user which configuration level to use via AskUserQuestion:

| Level | File | Description |
|-------|------|-------------|
| **Project Local** (default) | `settings.local.json` | Personal only. Not tracked by git. |
| **Project** | `settings.json` | Shared with team. Tracked by git. |

**Question example:**
- "設定をどのレベルに書き込みますか?"
- Options:
  1. "プロジェクトローカル (推奨)" - settings.local.json に書き込む。個人のみに適用、git管理されない。
  2. "プロジェクト" - settings.json に書き込む。チーム全員に適用、gitで共有される。

### Step 5: Write Hook to Settings File

Add selected hooks to the settings file chosen in Step 4.

| Level | File |
|-------|------|
| Project Local | `<TARGET_PROJECT>/.claude/settings.local.json` |
| Project | `<TARGET_PROJECT>/.claude/settings.json` |

**Hook command template:**
```
<NOTIFY_SH_PATH>
```

`notify.sh` reads stdin JSON automatically and extracts the message. No arguments needed.

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

**Important**: If the target settings file already has hooks, merge the new hooks into the existing `hooks` object. Do not overwrite other hooks.

### Step 6: Test

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

## Additional Resources

- **`references/api-reference.md`** - API endpoints and request/response formats
- **`references/hook-events.md`** - Per-event stdin JSON fields and integration patterns
- **`references/ai-summarization.md`** - AI message summarization setup
- **`examples/`** - Working hook configuration examples
