# API Reference

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notify` | Send a notification |
| `GET` | `/api/notifications` | List all notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |
| `DELETE` | `/api/notifications/:id` | Delete a notification |
| `GET` | `/api/events` | SSE stream for real-time updates |
| `GET` | `/api/health` | Health check |

## Notification Object

All endpoints return or contain the following structure:

```json
{
  "id": "uuid-string",
  "title": "string",
  "message": "string",
  "category": "string",
  "metadata": {},
  "read": false,
  "createdAt": "2026-02-19T12:00:00.000Z"
}
```

## POST /api/notify

Send a notification to the server.

### Request Body

```json
{
  "title": "string (required, non-empty)",
  "message": "string (required, non-empty)",
  "category": "string (optional, defaults to \"info\" when using notify.sh)",
  "metadata": "Record<string, unknown> (optional)"
}
```

### Success Response (201 Created)

Returns the created Notification object directly:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Task Complete",
  "message": "Build finished",
  "category": "info",
  "metadata": {},
  "read": false,
  "createdAt": "2026-02-19T12:00:00.000Z"
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "Invalid JSON"
}
```

Or with validation details:

```json
{
  "error": { "formErrors": [], "fieldErrors": { "title": ["..."] } }
}
```

## GET /api/notifications

Retrieve all stored notifications ordered by timestamp (newest first).

### Response (200 OK)

```json
{
  "notifications": [
    {
      "id": "string",
      "title": "string",
      "message": "string",
      "category": "string",
      "metadata": {},
      "read": false,
      "createdAt": "2026-02-19T12:00:00.000Z"
    }
  ]
}
```

## PATCH /api/notifications/:id/read

Mark a notification as read.

### Success Response (200 OK)

Returns the updated Notification object:

```json
{
  "id": "string",
  "title": "string",
  "message": "string",
  "category": "string",
  "metadata": {},
  "read": true,
  "createdAt": "2026-02-19T12:00:00.000Z"
}
```

### Error Response (404 Not Found)

```json
{
  "error": "Not found"
}
```

## DELETE /api/notifications/:id

Delete a notification by ID.

### Success Response (200 OK)

```json
{
  "success": true
}
```

### Error Response (404 Not Found)

```json
{
  "error": "Not found"
}
```

## GET /api/events

Server-Sent Events (SSE) stream for real-time notification updates.

### Event Types

| Event | Data | Description |
|-------|------|-------------|
| `created` | Notification object | New notification created |
| `read` | Notification object | Notification marked as read |
| `deleted` | `{"id":"..."}` | Notification deleted |
| `ping` | empty | Keep-alive (every 30 seconds) |

### Connection

```bash
curl -N http://localhost:23000/api/events
```

### Example SSE Stream

```
event: created
data: {"id":"...","title":"Task","message":"Done","category":"info","metadata":{},"read":false,"createdAt":"..."}
id: 1708300000000

event: ping
data:

event: read
data: {"id":"...","title":"Task","message":"Done","category":"info","metadata":{},"read":true,"createdAt":"..."}
id: 1708300030000
```

## GET /api/health

Health check endpoint.

### Response (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2026-02-19T12:00:00.000Z"
}
```

## notify.sh Hook Script Reference

`notify.sh` is a hook-dedicated script that reads stdin JSON from Claude Code hook events and sends notifications to the server. No arguments are needed.

### Usage

```bash
# As Claude Code hook command (stdin JSON is provided automatically)
<path>/notify.sh

# LAN access
NOTIFY_HOST=192.168.1.100 <path>/notify.sh
```

### Supported Hook Events

| Event | Behavior |
|-------|----------|
| **Stop** | Extracts `last_assistant_message`, sends as notification body |
| **Notification** | Extracts `title` and `message`, sends combined notification |
| **PreToolUse** | Logged only, no notification sent |
| **PostToolUse** | Logged only, no notification sent |
| **Unknown** | Sends fallback "Hook event: <event_name>" |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_HOST` | localhost | Server hostname or IP |
| `NOTIFY_PORT` | 23000 | Server port |
| `NOTIFY_LOG` | /tmp/notify-hook.log | Log file path |
| `CLAUDE_PROJECT_DIR` | (set by Claude Code) | Used as notification title via `basename` |

### Message Processing

1. Reads stdin JSON (provided by Claude Code hook system)
2. Extracts `hook_event_name` to determine event type
3. Extracts relevant message field based on event type
4. Sanitizes: removes control characters, truncates to 200 characters
5. Sends notification with `basename($CLAUDE_PROJECT_DIR)` as title

### Manual Testing

```bash
# Stop event
echo '{"hook_event_name":"Stop","last_assistant_message":"Build finished"}' | \
  CLAUDE_PROJECT_DIR=/tmp/my-project ./scripts/notify.sh

# Notification event
echo '{"hook_event_name":"Notification","message":"Permission needed","title":"Auth"}' | \
  CLAUDE_PROJECT_DIR=/tmp/my-project ./scripts/notify.sh

# LAN access
echo '{"hook_event_name":"Stop","last_assistant_message":"Done"}' | \
  CLAUDE_PROJECT_DIR=/tmp/my-project NOTIFY_HOST=192.168.1.100 ./scripts/notify.sh
```
