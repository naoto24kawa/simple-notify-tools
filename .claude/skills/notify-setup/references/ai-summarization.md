# AI Summarization

通知サーバーに `ANTHROPIC_API_KEY` を設定すると、長い通知メッセージをAIが自動要約する。

## 仕組み

1. `POST /api/notify` は即座に 201 を返す(hook をブロックしない)
2. バックグラウンドで Anthropic API (haiku) を呼び、要約を生成
3. 要約完了後、SSE `updated` イベントでフロントエンドに配信
4. ダッシュボードで要約がメッセージの上にイタリック表示される

## 有効化

通知サーバーの `.env` に `ANTHROPIC_API_KEY` を追加:

```bash
# .env (on the notification server)
ANTHROPIC_API_KEY=sk-ant-...
```

## 動作条件

| 条件 | 動作 |
|------|------|
| API キー未設定 | 要約なしで通知のみ(opt-in) |
| メッセージが80文字以下 | 要約スキップ(短いメッセージは不要) |
| API 呼び出し失敗 | 要約なし、通知は正常に残る |

## SSE イベント

要約が完了すると、サーバーから `updated` イベントが SSE ストリームに配信される:

```
event: updated
data: {"id":"...","title":"...","message":"...","summary":"AI generated summary","category":"complete",...}
```

フロントエンドは自動的に通知カードを更新し、要約を表示する。
