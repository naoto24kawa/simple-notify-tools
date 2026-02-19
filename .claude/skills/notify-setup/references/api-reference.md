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

## notify.sh CLI Reference

### Usage

```bash
./scripts/notify.sh "Title" "Message" [category] [metadata_json]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| Title | No | "Notification" | Notification title |
| Message | Yes | - | Notification body (non-empty) |
| Category | No | "info" | Category: info, error, deploy, etc. |
| Metadata | No | `{}` | Arbitrary JSON object |

Note: The `category` default "info" is set by notify.sh. When using curl directly, `category` is optional with no server-side default.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_HOST` | localhost | Server hostname or IP |
| `NOTIFY_PORT` | 3000 | Server port |

### Examples

```bash
# Basic notification
./scripts/notify.sh "Build" "Build finished"

# With category
./scripts/notify.sh "Error" "Test failed" "error"

# With metadata
./scripts/notify.sh "Deploy" "Deployed to prod" "deploy" '{"env":"prod"}'

# LAN access
NOTIFY_HOST=192.168.1.100 ./scripts/notify.sh "Task" "Done" "info"
```
