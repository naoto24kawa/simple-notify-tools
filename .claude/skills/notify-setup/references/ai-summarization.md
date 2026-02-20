# AI Summarization

通知サーバーが `claude` CLI (Claude Code) を検出すると、長い通知メッセージをAIが自動要約する。追加の API キーは不要。

## 仕組み

1. `POST /api/notify` は即座に 201 を返す(hook をブロックしない)
2. バックグラウンドで `claude -p` (pipe mode) を呼び、要約を生成
3. 要約完了後、SSE `updated` イベントでフロントエンドに配信
4. ダッシュボードで要約がメッセージの上にイタリック表示される

## 前提条件

- `claude` CLI がサーバーマシンの PATH に存在すること
- Claude Code の認証が済んでいること(`claude` が使える状態)

## 動作条件

| 条件 | 動作 |
|------|------|
| `claude` CLI 未検出 | 要約スキップ(警告ログのみ) |
| メッセージが80文字以下 | 要約スキップ(短いメッセージは不要) |
| `NOTIFY_SUMMARIZE=false` | 要約を明示的に無効化 |
| `claude -p` 失敗/タイムアウト | 要約なし、通知は正常に残る |

## 無効化

要約を無効にするには、サーバーの環境変数に設定:

```bash
NOTIFY_SUMMARIZE=false
```

## SSE イベント

要約が完了すると、サーバーから `updated` イベントが SSE ストリームに配信される:

```
event: updated
data: {"id":"...","title":"...","message":"...","summary":"AI generated summary","category":"complete",...}
```

フロントエンドは自動的に通知カードを更新し、要約を表示する。
