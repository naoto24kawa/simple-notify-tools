#!/bin/bash
# UI変更の確認用スクリプト
# Usage: bash scripts/verify-ui.sh

set -euo pipefail

PORT="${NOTIFY_PORT:-23000}"
BASE="http://localhost:${PORT}"

echo "=== UI Verification Script ==="
echo ""

# 1. サーバー疎通確認
echo "[1/4] Backend health check..."
HEALTH=$(curl -sf "${BASE}/api/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok"'; then
  echo "  OK: Backend is running on port ${PORT}"
else
  echo "  FAIL: Backend is not responding on port ${PORT}"
  echo "  Start with: bun run dev:backend"
  exit 1
fi

# 2. フロントエンドビルド確認
echo ""
echo "[2/4] Frontend build check..."
HTML=$(curl -sf "${BASE}/" 2>/dev/null || echo "FAIL")
if echo "$HTML" | grep -q 'assets/index-'; then
  echo "  OK: Frontend is being served (built files)"
else
  echo "  FAIL: Frontend not built or not served"
  echo "  Run: bun run build"
  exit 1
fi

# 3. ビルド済みJSにボタンテキストが含まれているか確認
echo ""
echo "[3/4] Button text check in built JS..."
JS_FILE=$(ls apps/frontend/dist/assets/index-*.js 2>/dev/null | head -1)
if [ -z "$JS_FILE" ]; then
  echo "  FAIL: Built JS not found"
  exit 1
fi

CHECKS=("Mark read" "Delete" "Open in VS Code" "ml-auto")
ALL_OK=true
for text in "${CHECKS[@]}"; do
  if grep -q "$text" "$JS_FILE"; then
    echo "  OK: Found '${text}'"
  else
    echo "  WARN: '${text}' not found in built JS"
    ALL_OK=false
  fi
done

# 4. テスト通知を送信して確認
echo ""
echo "[4/4] Sending test notification..."
NOTIFY_RESP=$(curl -sf -X POST "${BASE}/api/notify" \
  -H "Content-Type: application/json" \
  -d '{"title":"UI Verify","message":"Button visibility test","category":"test","metadata":{"project":"/tmp"}}' \
  2>/dev/null || echo "FAIL")

if echo "$NOTIFY_RESP" | grep -q '"id"'; then
  echo "  OK: Test notification sent"
  NOTIF_ID=$(echo "$NOTIFY_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  ID: ${NOTIF_ID}"
else
  echo "  WARN: Failed to send test notification"
fi

# レイアウト構造チェック(ソースコード)
echo ""
echo "=== Source Layout Check ==="
SRC="apps/frontend/src/components/app/notification-card.tsx"
if [ -f "$SRC" ]; then
  if grep -q "overflow-hidden" "$SRC"; then
    echo "  WARN: 'overflow-hidden' still in Card (may clip buttons)"
  else
    echo "  OK: No 'overflow-hidden' on Card"
  fi

  if grep -q "ml-auto" "$SRC"; then
    echo "  OK: Buttons use 'ml-auto' (right-aligned in footer)"
  else
    echo "  WARN: Buttons missing 'ml-auto'"
  fi

  if grep -q "justify-between" "$SRC"; then
    echo "  WARN: Old horizontal layout (justify-between) still present"
  else
    echo "  OK: No horizontal justify-between layout"
  fi
fi

echo ""
echo "=== Summary ==="
if $ALL_OK; then
  echo "All checks passed! Open ${BASE} in your browser to verify visually."
else
  echo "Some checks had warnings. Review output above."
fi
echo ""
echo "Browser URL: ${BASE}"
