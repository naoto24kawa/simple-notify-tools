#!/bin/bash
# notify.sh - Send notifications to the notification server
# Usage: ./scripts/notify.sh "Title" "Message" [category] [metadata_json]
#
# Examples:
#   ./scripts/notify.sh "Task Complete" "Build finished"
#   ./scripts/notify.sh "Error" "Test failed" "error"
#   ./scripts/notify.sh "Deploy" "Deployed to prod" "deploy" '{"env":"prod"}'
#
# Environment variables:
#   NOTIFY_HOST  - Server host (default: localhost)
#   NOTIFY_PORT  - Server port (default: 23000)

set -euo pipefail

NOTIFY_HOST="${NOTIFY_HOST:-localhost}"
NOTIFY_PORT="${NOTIFY_PORT:-23000}"
NOTIFY_URL="http://${NOTIFY_HOST}:${NOTIFY_PORT}/api/notify"
LOG_FILE="${NOTIFY_LOG:-/tmp/notify-hook.log}"

TITLE="${1:-Notification}"
MESSAGE="${2:-}"
CATEGORY="${3:-info}"
_DEFAULT_META='{}'
METADATA="${4:-$_DEFAULT_META}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

log "--- notify.sh called ---"
log "TITLE=${TITLE}"
log "MESSAGE=${MESSAGE:0:100}"
log "URL=${NOTIFY_URL}"

# Build JSON safely with jq to handle special characters
JSON_PAYLOAD=$(jq -n \
  --arg title "$TITLE" \
  --arg message "${MESSAGE:-Task completed}" \
  --arg category "$CATEGORY" \
  --argjson metadata "$METADATA" \
  '{title: $title, message: $message, category: $category, metadata: $metadata}')

log "PAYLOAD=${JSON_PAYLOAD:0:200}"

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "${NOTIFY_URL}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" 2>> "$LOG_FILE") || HTTP_CODE="FAIL"

log "HTTP_CODE=${HTTP_CODE}"

if [ "$HTTP_CODE" != "201" ]; then
  log "ERROR: notification failed (HTTP ${HTTP_CODE})"
  echo "Failed to send notification (HTTP ${HTTP_CODE})" >&2
  exit 1
fi

log "OK"
