# CI/CD 修正 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全て failure の GitHub Actions CI を動く状態に修正し、不要な deploy ワークフローを削除する

**Architecture:** 既存 `ci.yml` を最小修正。lint / typecheck / backend-test / frontend-test の4ジョブを並列実行し、全て成功後に e2e-test を実行する。

**Tech Stack:** GitHub Actions, Bun, Biome, TypeScript, Playwright

---

### Task 1: deploy.yml を削除する

**Files:**
- Delete: `.github/workflows/deploy.yml`

**Step 1: deploy.yml を削除**

`.github/workflows/deploy.yml` を削除する。
このファイルは Cloudflare Pages へのデプロイ用だが、Secrets 未設定で不要。

**Step 2: 削除を確認**

Run: `ls .github/workflows/`
Expected: `ci.yml` のみ表示される

**Step 3: コミット**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: remove unused deploy workflow"
```

---

### Task 2: ルート package.json にスクリプトを追加する

**Files:**
- Modify: `package.json`

**Step 1: スクリプトを追加**

`package.json` の `scripts` に以下を追加:

```json
"test:backend": "cd apps/backend && bun test",
"typecheck": "tsc --noEmit -p apps/frontend/tsconfig.json && tsc --noEmit -p apps/backend/tsconfig.json && tsc --noEmit -p packages/types/tsconfig.json"
```

**Step 2: typecheck の動作確認**

Run: `bun run typecheck`
Expected: エラーなしで完了(もしエラーが出たら先に修正が必要)

**Step 3: backend test の動作確認**

Run: `bun run test:backend`
Expected: バックエンドのテストが実行される(失敗してもOK、実行されることが重要)

**Step 4: コミット**

```bash
git add package.json
git commit -m "chore: add typecheck and test:backend scripts"
```

---

### Task 3: ci.yml を修正する

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: ci.yml を書き換え**

`.github/workflows/ci.yml` を以下の内容に書き換える:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run Biome lint
        run: bun run lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run type check
        run: bun run typecheck

  backend-test:
    name: Backend Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run backend tests
        run: bun run test:backend

  e2e-test:
    name: E2E Test
    runs-on: ubuntu-latest
    needs: [lint, typecheck, backend-test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bun run test
        working-directory: apps/frontend

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: apps/frontend/playwright-report/
          retention-days: 30
```

**Step 2: YAML 構文を検証**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: エラーなし(構文的に正しい)

もし python3/yaml が無い場合:
Run: `cat .github/workflows/ci.yml | head -5`
Expected: `name: CI` が表示される

**Step 3: コミット**

```bash
git add .github/workflows/ci.yml
git commit -m "fix: repair CI workflow with typecheck and backend tests"
```

---

### Task 4: ローカルで全チェックを実行して確認する

**Files:** なし(検証のみ)

**Step 1: lint を確認**

Run: `bun run lint`
Expected: エラーなし

**Step 2: typecheck を確認**

Run: `bun run typecheck`
Expected: エラーなし

**Step 3: backend test を確認**

Run: `bun run test:backend`
Expected: テスト結果が表示される

**Step 4: validate を確認**

Run: `bun run validate`
Expected: lint + test + build が全て通る

---

### Task 5: PR を作成して CI を動作確認する

**Files:** なし

**Step 1: ブランチを作成してプッシュ**

```bash
git checkout -b fix/ci-workflow
git push -u origin fix/ci-workflow
```

**Step 2: PR を作成**

```bash
gh pr create --title "fix: repair CI workflow" --body "## Summary
- Remove unused deploy workflow (Secrets not configured, not needed)
- Fix unit-test job: replace missing test:coverage with test:backend
- Add type check job (tsc --noEmit)
- Add backend test job
- Restructure job dependencies

## Changes
- Delete .github/workflows/deploy.yml
- Rewrite .github/workflows/ci.yml
- Add typecheck and test:backend scripts to root package.json

## Test plan
- [ ] CI lint job passes
- [ ] CI typecheck job passes
- [ ] CI backend-test job passes
- [ ] CI e2e-test job passes
- [ ] All 4 jobs show green on PR"
```

**Step 3: CI の実行結果を確認**

Run: `gh run list --limit 5`
Expected: CI ワークフローが実行中 or 成功

---

## 注意事項

- Task 2 の typecheck でエラーが出た場合、型エラーの修正が先に必要
- Task 3 の backend test で既存テストが失敗する場合、テスト修正が先に必要
- E2E テストは Playwright の3ブラウザ(chromium/firefox/webkit)で実行される。CI 時間が問題になったら chromium のみに絞る検討が可能
