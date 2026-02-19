# remote-chrome-e2e スキル実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Claude が Playwright スクリプトを都度生成して「操作 + 検証 + スクショ」を行う統合 E2E スキルを remote-chrome プラグインに追加する。

**Architecture:** 既存の `remote-chrome-screenshot` スキルの Phase 構造を踏襲し、Phase 4 に「スクリプト生成 + 転送」を追加した 6 Phase ワークフロー。テンプレートスクリプト + Playwright API リファレンスを同梱し、Claude が自由にカスタマイズしたスクリプトを生成する。

**Tech Stack:** Playwright-core, Node.js (ESM), tmux MCP, SSH

**Design doc:** `docs/plans/2026-02-19-remote-chrome-e2e-design.md`

**Plugin repo:** `/home/naoto24kawa/projects/naoto24kawa/claude-plugins/`

---

### Task 1: ディレクトリ構造作成

**Files:**
- Create: `plugins/remote-chrome/skills/remote-chrome-e2e/scripts/` (dir)
- Create: `plugins/remote-chrome/skills/remote-chrome-e2e/references/` (dir)

**Step 1: スキルディレクトリを作成**

```bash
mkdir -p /home/naoto24kawa/projects/naoto24kawa/claude-plugins/plugins/remote-chrome/skills/remote-chrome-e2e/scripts
mkdir -p /home/naoto24kawa/projects/naoto24kawa/claude-plugins/plugins/remote-chrome/skills/remote-chrome-e2e/references
```

**Step 2: ディレクトリ確認**

```bash
ls -la /home/naoto24kawa/projects/naoto24kawa/claude-plugins/plugins/remote-chrome/skills/remote-chrome-e2e/
```

Expected: `scripts/` と `references/` が存在する

---

### Task 2: pw_template.mjs 作成

**Files:**
- Create: `plugins/remote-chrome/skills/remote-chrome-e2e/scripts/pw_template.mjs`

**Step 1: テンプレートスクリプトを作成**

```javascript
#!/usr/bin/env node
// pw_e2e.mjs - E2E verification + screenshot template
// Usage: Customize the "Custom Actions" section and deploy to remote machine
// Base: node pw_e2e.mjs (no args - all config is inline)
// Requires: playwright-core (`npm install playwright-core`), Google Chrome

import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // --- Navigation ---
  await page.goto('http://localhost:23000/', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // === Custom Actions (Claude generates this section) ===
  // Examples:
  //   await page.click('.notification-card');
  //   await page.fill('#search', 'keyword');
  //   await page.waitForSelector('.result-list');
  //   await page.selectOption('#dropdown', 'option-value');
  // === End Custom Actions ===

  // --- Verification ---
  const title = await page.title();
  const bodyText = await page.textContent('body');
  console.log(`Title: ${title}`);
  console.log(`Body preview: ${(bodyText || '').substring(0, 200)}`);

  // --- Screenshot ---
  await page.screenshot({ path: '/tmp/pw_e2e.png', fullPage: false });

  const fs = await import('node:fs');
  const stat = fs.statSync('/tmp/pw_e2e.png');
  console.log(`Screenshot saved: /tmp/pw_e2e.png (${stat.size} bytes)`);
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  console.log('Done.');
}
```

**Step 2: 構文チェック**

```bash
node --check /home/naoto24kawa/projects/naoto24kawa/claude-plugins/plugins/remote-chrome/skills/remote-chrome-e2e/scripts/pw_template.mjs
```

Expected: エラーなし

---

### Task 3: playwright-actions.md 作成

**Files:**
- Create: `plugins/remote-chrome/skills/remote-chrome-e2e/references/playwright-actions.md`

**Step 1: Playwright API リファレンスを作成**

以下のカテゴリを網羅する:

- **Navigation**: `page.goto()`, `page.reload()`, `page.goBack()`, `page.waitForURL()`
- **Click / Interaction**: `page.click()`, `page.dblclick()`, `page.hover()`, `page.check()`, `page.uncheck()`
- **Input**: `page.fill()`, `page.type()`, `page.selectOption()`, `page.setInputFiles()`
- **Wait**: `page.waitForSelector()`, `page.waitForTimeout()`, `page.waitForURL()`, `page.waitForLoadState()`
- **Query / Extract**: `page.title()`, `page.textContent()`, `page.innerHTML()`, `page.getAttribute()`, `page.locator().count()`, `page.locator().allTextContents()`
- **Assert**: `page.isVisible()`, `page.isEnabled()`, `page.isChecked()`
- **Screenshot**: `page.screenshot()`, `page.locator().screenshot()`
- **Keyboard / Mouse**: `page.keyboard.press()`, `page.mouse.click()`

各 API は `page.method(selector, options)` 形式で、よく使うオプションと使用例を含める。

---

### Task 4: SKILL.md 作成

**Files:**
- Create: `plugins/remote-chrome/skills/remote-chrome-e2e/SKILL.md`

**Step 1: SKILL.md を作成**

Frontmatter:
- `name: remote-chrome-e2e`
- `description`: "This skill should be used when..." 形式で、トリガーフレーズを含める:
  - 「E2Eテスト」「操作してスクショ」「動作検証してキャプチャ」「フォーム入力してスクショ」
  - 「クリックしてスクショ」「Playwright で E2E」「remote E2E test」
  - 「リモートで操作検証」「ブラウザ操作してスクリーンショット」

Body (6 Phase):
- Phase 1: 環境確認 (tmux MCP ロード、`.claude/remote-chrome.local.md` 読み取り)
- Phase 2: リバーストンネル構築 (ローカルアプリアクセス時のみ)
- Phase 3: Playwright 環境準備 (`npm install playwright-core`)
- Phase 4: スクリプト生成 + 転送 (テンプレートをベースにカスタマイズ、base64 転送)
- Phase 5: 実行 + 検証 (`node /tmp/pw_e2e.mjs`、コンソール出力確認)
- Phase 6: ファイル転送 + クリーンアップ (HTTP サーバー + SSH トンネル)

既存スキルとの使い分け表を冒頭に配置する。

Writing style: 命令形/不定詞形。二人称は使わない。

**Step 2: ワードカウント確認**

Target: 1,500-2,000 words。3,000 words を超えないこと。

---

### Task 5: marketplace.json 更新

**Files:**
- Modify: `/home/naoto24kawa/projects/naoto24kawa/claude-plugins/.claude-plugin/marketplace.json`

**Step 1: バージョン更新**

- `marketplace.version`: `"3.11.0"` -> `"3.12.0"`
- `remote-chrome.version`: `"1.1.0"` -> `"1.2.0"`
- `remote-chrome.description`: E2E テスト機能を追記

---

### Task 6: コミット + プッシュ

**Step 1: プラグインリポジトリでコミット**

```bash
cd /home/naoto24kawa/projects/naoto24kawa/claude-plugins
git add plugins/remote-chrome/skills/remote-chrome-e2e/ .claude-plugin/marketplace.json
git commit -m "feat: add remote-chrome-e2e skill (v1.2.0, marketplace v3.12.0)

Playwright-based E2E workflow: Claude generates custom scripts for
browser interaction + verification + screenshot capture.

🤖 Generated with Claude Code"
git push
```

**Step 2: プラグインキャッシュ更新**

```bash
# marketplace cache
cp -r plugins/remote-chrome/skills/remote-chrome-e2e \
  ~/.claude/plugins/marketplaces/naoto24kawa-claude-plugins/plugins/remote-chrome/skills/

# version cache
cp -r plugins/remote-chrome/skills/remote-chrome-e2e \
  ~/.claude/plugins/cache/naoto24kawa-claude-plugins/remote-chrome/1.1.0/skills/

mkdir -p ~/.claude/plugins/cache/naoto24kawa-claude-plugins/remote-chrome/1.2.0/skills/
cp -r plugins/remote-chrome/skills/ \
  ~/.claude/plugins/cache/naoto24kawa-claude-plugins/remote-chrome/1.2.0/skills/

# marketplace.json cache
cp .claude-plugin/marketplace.json \
  ~/.claude/plugins/marketplaces/naoto24kawa-claude-plugins/.claude-plugin/
```

---

### Task 7: スキルレビュー

**Step 1: skill-reviewer でレビュー**

Plugin-dev の skill-reviewer エージェントを使ってスキル品質をチェック:
- Description のトリガーフレーズ
- Writing style (命令形/不定詞形)
- Progressive disclosure (SKILL.md のワードカウント)
- Referenced files の存在確認
- テンプレートスクリプトの品質

**Step 2: レビュー指摘の修正**

Major/Minor issues を修正し、追加コミット。

---

### Task 8: remote-chrome.local.md にスキル参照追加

**Files:**
- Modify: `/home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/.claude/remote-chrome.local.md`

**Step 1: スキル参照セクションに e2e を追加**

```markdown
## スキル参照

- Chrome操作: `remote-chrome:remote-chrome-control`
- スクリーンショット: `remote-chrome:remote-chrome-screenshot`
- E2E検証: `remote-chrome:remote-chrome-e2e`
```
