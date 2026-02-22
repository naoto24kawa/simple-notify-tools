# AI Summarization

When the notification server detects the `claude` CLI (Claude Code) on the server machine, it automatically summarizes long notification messages using AI. No additional API key is needed.

## How It Works

1. `POST /api/notify` returns 201 immediately (does not block the hook)
2. A background process calls `claude -p` (pipe mode) to generate a summary
3. On completion, an SSE `updated` event delivers the summary to the frontend
4. The dashboard displays the summary in italics above the original message

## Prerequisites

- `claude` CLI must be available in PATH on the server machine
- Claude Code authentication must be configured (`claude` must be usable)

## Behavior Conditions

| Condition | Behavior |
|-----------|----------|
| `claude` CLI not found | Summarization skipped (warning logged) |
| Message is 80 characters or shorter | Summarization skipped (not needed for short messages) |
| `NOTIFY_SUMMARIZE=false` | Summarization explicitly disabled |
| `claude -p` fails or times out | No summary generated; notification remains intact |

## Disabling Summarization

Set the following environment variable on the server:

```bash
NOTIFY_SUMMARIZE=false
```

## SSE Events

When summarization completes, the server emits an `updated` event on the SSE stream:

```
event: updated
data: {"id":"...","title":"...","message":"...","summary":"AI generated summary","category":"complete",...}
```

The frontend automatically updates the notification card to display the summary.
