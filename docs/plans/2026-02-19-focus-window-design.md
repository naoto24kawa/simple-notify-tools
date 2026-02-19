# Focus Window on Notification Click

## Overview

Clicking a notification card in the frontend navigates (focuses) to the VS Code window that sent the notification.

## Approach

Backend API approach: Frontend calls a backend endpoint, backend executes `code <projectDir>` to focus the VS Code window.

## Components

### Backend: `POST /api/focus-window`

- Request: `{ "projectDir": "/home/user/my-project" }`
- Response: `{ "success": true }` or `{ "error": "..." }`
- Validation: directory existence check, reject dangerous characters
- Execution: `Bun.spawn(["code", projectDir])`

### Frontend: Clickable notification cards

- Cards with `metadata.project` become clickable
- Click calls `POST /api/focus-window` with project path
- Visual hints: cursor pointer, hover effect
- Existing buttons (Mark read, Delete) stop event propagation

## Files Changed

| File | Change |
|------|--------|
| `apps/backend/src/routes/focus-window.ts` | New: API endpoint |
| `apps/backend/src/index.ts` | Route registration |
| `apps/frontend/src/components/app/notification-card.tsx` | Click handler |
| `apps/frontend/src/lib/api-client.ts` | API call function |
