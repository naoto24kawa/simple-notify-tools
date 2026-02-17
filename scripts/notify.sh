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
#   NOTIFY_PORT  - Server port (default: 3000)

set -euo pipefail

NOTIFY_HOST="${NOTIFY_HOST:-localhost}"
NOTIFY_PORT="${NOTIFY_PORT:-3000}"
NOTIFY_URL="http://${NOTIFY_HOST}:${NOTIFY_PORT}/api/notify"

TITLE="${1:-Notification}"
MESSAGE="${2:-}"
CATEGORY="${3:-info}"
METADATA="${4:-{}}"

curl -sf -X POST "${NOTIFY_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"${TITLE}\",
    \"message\": \"${MESSAGE}\",
    \"category\": \"${CATEGORY}\",
    \"metadata\": ${METADATA}
  }" || echo "Failed to send notification (server may be down)" >&2
