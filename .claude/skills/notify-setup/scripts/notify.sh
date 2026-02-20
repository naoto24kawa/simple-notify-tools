#!/bin/bash
# notify.sh - Claude Code hook notification script
# Reads stdin JSON from hook events and sends notifications to the server.
#
# Usage (as Claude Code hook command):
#   <path>/notify.sh
#   NOTIFY_HOST=192.168.1.100 <path>/notify.sh
#
# Supported hook events:
#   Stop         - sends last_assistant_message as notification
#   Notification - sends message/title from Claude's internal notifications
#   PreToolUse   - placeholder (logged only)
#   PostToolUse  - placeholder (logged only)
#
# Environment variables:
#   NOTIFY_HOST         - Server host (default: localhost)
#   NOTIFY_PORT         - Server port (default: 23000)
#   NOTIFY_LOG          - Log file path (default: /tmp/notify-hook.log)
#   CLAUDE_PROJECT_DIR  - Set by Claude Code, used as notification title

set -euo pipefail

NOTIFY_HOST="${NOTIFY_HOST:-localhost}"
NOTIFY_PORT="${NOTIFY_PORT:-23000}"
NOTIFY_URL="http://${NOTIFY_HOST}:${NOTIFY_PORT}/api/notify"
LOG_FILE="${NOTIFY_LOG:-/tmp/notify-hook.log}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

sanitize() {
  # Remove control characters and truncate to 200 chars
  printf '%s' "$1" | tr -d '\000-\037' | head -c 200
}

send_notification() {
  local title="$1"
  local message="$2"
  local category="${3:-info}"
  local metadata="$4"
  [ -z "$metadata" ] && metadata='{}'

  local payload
  payload=$(jq -n \
    --arg title "$title" \
    --arg message "$message" \
    --arg category "$category" \
    --argjson metadata "$metadata" \
    '{title: $title, message: $message, category: $category, metadata: $metadata}')

  log "PAYLOAD=${payload:0:200}"

  local http_code
  http_code=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "${NOTIFY_URL}" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>> "$LOG_FILE") || http_code="FAIL"

  log "HTTP_CODE=${http_code}"

  if [ "$http_code" != "201" ]; then
    log "ERROR: notification failed (HTTP ${http_code})"
    echo "Failed to send notification (HTTP ${http_code})" >&2
    exit 1
  fi

  log "OK"
}

# --- Main ---

log "--- notify.sh called ---"

# Read stdin JSON
INPUT=$(cat -)
log "INPUT=${INPUT:0:200}"

# Parse event name
EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
log "EVENT=${EVENT}"

# Derive title from project directory
TITLE="$(basename "${CLAUDE_PROJECT_DIR:-unknown}")"

# Extract message and category based on event type
CATEGORY="info"
case "$EVENT" in
  Stop)
    MESSAGE=$(printf '%s' "$INPUT" | jq -r '.last_assistant_message // "Task completed"' 2>/dev/null)
    CATEGORY="complete"
    ;;
  Notification)
    MSG=$(printf '%s' "$INPUT" | jq -r '.message // empty' 2>/dev/null)
    NTITLE=$(printf '%s' "$INPUT" | jq -r '.title // empty' 2>/dev/null)
    if [ -n "$NTITLE" ]; then
      MESSAGE="${NTITLE}: ${MSG}"
    else
      MESSAGE="${MSG:-Notification received}"
    fi
    CATEGORY="action_required"
    ;;
  PreToolUse|PostToolUse)
    TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
    log "SKIP: ${EVENT} (${TOOL}) - no notification sent"
    exit 0
    ;;
  *)
    MESSAGE="${EVENT:+Hook event: ${EVENT}}"
    MESSAGE="${MESSAGE:-Task completed}"
    ;;
esac

# Sanitize message
MESSAGE=$(sanitize "$MESSAGE")
MESSAGE="${MESSAGE:-Task completed}"

# Build metadata with hostname
METADATA=$(jq -n \
  --arg hostname "$(hostname)" \
  --arg project "${CLAUDE_PROJECT_DIR:-}" \
  '{hostname: $hostname, project: $project}')

log "TITLE=${TITLE} MESSAGE=${MESSAGE:0:100}"

send_notification "$TITLE" "$MESSAGE" "$CATEGORY" "$METADATA"
