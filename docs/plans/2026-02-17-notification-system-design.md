# Notification System Design

## Overview

Claude Code Hooks から作業完了通知を送信し、Web ダッシュボードで一覧管理 + ブラウザデスクトップ通知で受信するシンプルな通知システム。

## Requirements

- **通知送信**: Claude Code Hooks からシェルスクリプト(curl)で POST
- **通知受信**: Web ダッシュボード + ブラウザ Notification API
- **通知内容**: リッチ(構造化 JSON データ)
- **デプロイ**: ローカルネットワーク内のみ
- **永続化**: JSON ファイル
- **クロスプラットフォーム**: Mac, WSL, Linux 対応

## Architecture

```
+------------------+     curl POST      +------------------+
|  Claude Code     | -----------------> |  Hono Server     |
|  Hooks           |   /api/notify      |  (@hono/node-server)
|  (send client)   |                    |  :3000           |
+------------------+                    |                  |
                                        |  JSON file       |
                                        |  persistence     |
+------------------+     SSE            |                  |
|  React SPA       | <----------------- |  /api/events     |
|  (dashboard)     |   real-time push   |                  |
|  :5173           |                    +------------------+
|                  |
|  Notification API| -> Desktop notification
+------------------+
```

### Flow

1. Claude Code Hooks execute shell script on task completion
2. Script sends `curl -X POST http://<server>:3000/api/notify` with JSON payload
3. Hono server persists to JSON file + pushes to connected SSE clients
4. React SPA receives via SSE -> updates dashboard + triggers browser Notification API

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notify` | Send a notification |
| GET | `/api/notifications` | List all notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| GET | `/api/events` | SSE stream |
| GET | `/api/health` | Health check |

## Data Model

```typescript
interface Notification {
  id: string;                          // UUID
  title: string;                       // Notification title
  message: string;                     // Notification message
  category: string;                    // e.g., "task_complete", "error", "info"
  metadata: Record<string, unknown>;   // Arbitrary structured data
  read: boolean;                       // Read flag
  createdAt: string;                   // ISO 8601 timestamp
}
```

## Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Server runtime | Bun + `@hono/node-server` | Already in deps, cross-platform |
| API framework | Hono | Existing template, type-safe RPC |
| Frontend | React + Vite + Tailwind + shadcn/ui | Existing template |
| Real-time | SSE (Hono streaming) | Simple, ideal for one-way push |
| Desktop notification | Web Notification API | Browser standard, no extra deps |
| Persistence | JSON file | Zero deps, simple |
| Validation | Zod | Type-safe request validation |
| ID generation | `crypto.randomUUID()` | Node.js/Bun standard |

## Project Structure

```
apps/
  backend/
    src/
      index.ts                     # Entry point (route integration)
      routes/
        notifications.ts           # Notification CRUD API
        events.ts                  # SSE endpoint
      store/
        notification-store.ts      # JSON file persistence
  frontend/
    src/
      components/
        app/
          app.tsx                  # Main app
          notification-list.tsx    # Notification list
          notification-card.tsx    # Notification card
          notification-badge.tsx   # Unread badge
      hooks/
        use-notifications.ts       # Notification data management
        use-sse.ts                # SSE connection hook
      lib/
        api-client.ts             # Hono RPC client
packages/
  types/
    src/
      notification.ts             # Notification type definitions
      index.ts
scripts/
  notify.sh                       # Send script for Claude Code Hooks
data/
  notifications.json              # Persisted data (gitignored)
```

## Client Script Example

```bash
#!/bin/bash
# notify.sh - Called from Claude Code Hooks
NOTIFY_HOST="${NOTIFY_HOST:-localhost}"
NOTIFY_PORT="${NOTIFY_PORT:-3000}"

curl -s -X POST "http://${NOTIFY_HOST}:${NOTIFY_PORT}/api/notify" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"${1:-Task completed}\",
    \"message\": \"${2:-Operation finished successfully}\",
    \"category\": \"${3:-task_complete}\",
    \"metadata\": ${4:-{}}
  }"
```

## Error Handling

| Scenario | Strategy |
|----------|----------|
| JSON file read/write failure | Auto-create if missing, return 500 on write failure |
| SSE connection drop | Client auto-reconnects (EventSource default) |
| Invalid POST data | Zod validation, return 400 |
| Server not running (curl) | Client-side connection error message |
| Concurrent writes | In-memory write queue (serialization) |

## Testing Strategy

| Layer | What to Test | Tool |
|-------|-------------|------|
| API | Notification CRUD, SSE stream | Vitest + Hono test helper |
| Store | JSON file read/write | Vitest (temp files) |
| Frontend | Component rendering | Storybook |
| E2E | Send notification -> list display flow | Playwright |

## Out of Scope (YAGNI)

- Authentication/authorization (local network only)
- Notification grouping/filtering
- Multi-user support
- Notification priority
- Notification expiry/auto-deletion

## Decisions

- **Approach**: Hono local server + React SPA + SSE (chose over Express/Fastify and WebSocket alternatives)
- **SSE over WebSocket**: One-way push is sufficient; SSE is simpler
- **JSON file over SQLite/in-memory**: Simple persistence with no dependencies; acceptable for local single-user use
- **Bun over Node.js**: Already used in the project; faster startup
