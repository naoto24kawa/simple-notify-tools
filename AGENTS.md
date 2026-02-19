# AGENTS.md

AI アシスタント向け共通ドキュメント。常に日本語で回答してください。

## プロジェクト概要

**Hono + React 通知アプリケーション** - SSE ベースのリアルタイム通知システム

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Hono (Bun ネイティブ) |
| フロントエンド | React 19 + Vite + Tailwind CSS 4 + shadcn/ui |
| テスト | Bun test + Playwright + Storybook |
| ツール | Bun, Biome, Lefthook |

## コマンド

```bash
# 開発
bun run dev              # API(:23000) + Vite(:5173) 同時起動
bun run dev:server       # API サーバーのみ :23000
bun run dev:client       # Vite のみ :5173

# 品質チェック
bun run lint             # Biome チェック
bun run lint:fix         # 自動修正
bun run test             # バックエンド単体テスト
bun run test:e2e         # Playwright E2E テスト
bun run validate         # lint + test + build 統合チェック
bun run storybook        # Storybook :6006

# ビルド・本番
bun run build            # Vite ビルド(dist/)
bun run start            # 本番サーバー :23000

# shadcn/ui 追加
bunx shadcn add <component>
```

## ディレクトリ構造

```
src/
├── server/             # Hono 通知サーバー
│   ├── index.ts        # エントリポイント(AppType export, ポート :23000)
│   ├── routes/         # notifications.ts, events.ts(SSE), focus-window.ts
│   ├── store/          # notification-store.ts(インメモリ + ファイル永続化)
│   └── lib/            # desktop-notify.ts
├── client/             # React SPA
│   ├── index.tsx       # React エントリ
│   ├── components/     # UI コンポーネント
│   ├── hooks/          # use-notifications, use-sse
│   ├── lib/            # api-client.ts, utils.ts
│   └── styles/         # グローバルスタイル
└── shared/             # 共有型定義
    └── types.ts        # Notification, CreateNotificationPayload

scripts/
└── notify.sh           # CLI 通知クライアント(curl ラッパー)

e2e/                    # Playwright E2E テスト
data/                   # ランタイム JSON データ(gitignore 対象)
docs/plans/             # 設計ドキュメント
```

## 環境セットアップ

```bash
cp .env.example .env  # GITHUB_TOKEN 等を設定
bun install
```

## 通知システム

サーバーは SSE ベースの通知サーバー。

| エンドポイント | 用途 |
|---------------|------|
| `POST /api/notify` | 通知送信(title, message, category, metadata) |
| `GET /api/events` | SSE ストリーム(リアルタイム受信) |
| `GET /api/health` | ヘルスチェック |
| `POST /api/focus-window` | VS Code ウィンドウフォーカス |

CLI から送信: `./scripts/notify.sh "Title" "Message" [category] [metadata_json]`

環境変数 `NOTIFY_HOST`(default: localhost), `NOTIFY_PORT`(default: 23000) で接続先を変更可能。

## 開発ガイドライン

### テスト

- 機能実装時は対応するテストも実装・更新
- 単体テスト: `*.test.ts(x)` を対象ファイルと同じディレクトリに配置
- E2E: `e2e/` に配置

### Lint (Biome)

警告レベルのルール(即時対応不要):
- `noExcessiveCognitiveComplexity`: 複雑度 15 超過
- `noNonNullAssertion`: 非 null アサーション使用
- `useExhaustiveDependencies`: 依存配列不足

## コードレビューの思想

### 評価の観点

1. **SRP**: クラス/関数の責任分離
2. **Code for Humans**: 可読性、保守性
3. **KISS**: シンプルで明確な実装
4. **CoC**: プロジェクト規約への準拠
5. **TypeScript 型安全性**: 適切な型定義、any の排除

### トレードオフの優先順位

```
セキュリティ > 保守性 > パフォーマンス > コード美観
```

### 段階的改善

```
Phase 1: 安全性(セキュリティ、型安全性)
Phase 2: 保守性(SRP、可読性)
Phase 3: パフォーマンス最適化
Phase 4: 美観と規約統一
```

### 優先度判定

| 優先度 | 基準 |
|--------|------|
| Critical | セキュリティ、データ整合性、システム安定性 |
| High | 保守性への大きな影響、将来的なバグのリスク |
| Medium | コード品質向上、規約違反 |
| Low | 最適化、効率化 |

### SRP vs KISS

- 50 行以下 → KISS 優先
- 50-100 行 → 明確に異なる責任がある場合のみ分割
- 100 行以上 → SRP 優先

## GitHub テンプレート

### Issue テンプレート

| テンプレート | 用途 | ラベル |
|-------------|------|--------|
| `feature.yml` | 機能追加 | enhancement |
| `bug.yml` | バグ報告 | bug |
| `task.yml` | リファクタリング、ドキュメント等 | task |

### PR テンプレート

| テンプレート | 用途 |
|-------------|------|
| `PULL_REQUEST_TEMPLATE.md` | 通常の PR |
| `PULL_REQUEST_TEMPLATE/deploy.md` | 本番デプロイ |

## 重要な制約事項

- **Zod v4 使用**: v3 と API が異なる(`z.record` の引数形式等に注意)
- **TypeScript strict モード必須**: Hono RPC に必要
- **CSS ファイルは Biome 対象外**: Tailwind ディレクティブとの互換性のため
- **`data/` は gitignore 対象**: `**/data/*.json` がignore されるため、テスト用JSONを配置しないこと
- **pre-commit フック(Lefthook)**: コミット時に Biome が自動実行され、修正が自動ステージングされる

## ドキュメント

<!-- DELETE_AFTER_SETUP_START -->
**初回セットアップ**: [__docs__/SETUP.md](__docs__/SETUP.md) を参照してください。
<!-- DELETE_AFTER_SETUP_END -->

| ファイル | 内容 |
|----------|------|
| [__docs__/REFERENCE.md](__docs__/REFERENCE.md) | Hono RPC 実装、TypeScript 設定、トラブルシューティング |
