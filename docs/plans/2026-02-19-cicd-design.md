# CI/CD 改善設計

## 背景

- GitHub Actions の CI/Deploy が初回から全て failure(8回連続)
- Unit Test ジョブが存在しないスクリプト(`test:coverage`)を呼んでいる
- Deploy は Secrets 未設定で不要
- バックエンドテスト(4ファイル)が CI に含まれていない
- 型チェックが CI に含まれていない

## 方針: 最小修正

既存の `ci.yml` を修正して動く状態にする。

## 変更内容

### 1. `deploy.yml` の削除

デプロイは不要なので `.github/workflows/deploy.yml` を削除。

### 2. `ci.yml` のジョブ構成

```
lint ──────────┐
typecheck ─────┤
backend-test ──┼──→ e2e-test
frontend-test ─┘
```

| ジョブ | コマンド | 変更 |
|--------|---------|------|
| lint | `bun run lint` | 変更なし |
| typecheck (新規) | `tsc --noEmit` | 新規追加 |
| backend-test (新規) | `cd apps/backend && bun test` | 新規追加 |
| frontend-test (改名) | `cd apps/frontend && bun run test` | `test:coverage` を修正、coverage artifact 削除 |
| e2e-test | Playwright E2E | `needs` を4ジョブに更新 |

### 3. 共通改善

- `bun install` にキャッシュ追加

### 4. ルート `package.json` スクリプト追加

- `test:backend`: `cd apps/backend && bun test`
- `typecheck`: `tsc --noEmit`

## スコープ外

- PR のブランチ保護ルール設定
- E2E のブラウザ制限
