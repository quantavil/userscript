# Guidely Plus Userscript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite-based userscript for Guidely that re-enables right-click and allows exporting full mock tests to Markdown.

**Architecture:** A modern TypeScript userscript using `vite-plugin-monkey` for Tampermonkey integration and `turndown` for HTML-to-Markdown conversion. It injects a UI button and runs a crawler that parses DOM elements to extract questions.

**Tech Stack:** Bun, Vite, TypeScript, vite-plugin-monkey, turndown.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `guidely/package.json`
- Create: `guidely/tsconfig.json`
- Create: `guidely/vite.config.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "guidely-plus",
  "version": "1.0.0",
  "description": "Guidely Plus userscript",
  "main": "index.js",
  "scripts": {
    "build": "bunx vite build",
    "dev": "bunx vite"
  },
  "type": "module",
  "devDependencies": {
    "@types/turndown": "^5.0.6",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vite-plugin-monkey": "^4.0.0"
  },
  "dependencies": {
    "turndown": "^7.2.4",
    "turndown-plugin-gfm": "^1.0.2"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Guidely Plus',
        namespace: 'npm/vite-plugin-monkey',
        match: ['*://*.guidely.in/*'],
        grant: ['GM_setClipboard'],
        version: '1.0.0',
        author: 'quantavil',
      },
    }),
  ],
});
```

- [ ] **Step 4: Install dependencies**

Run: `cd guidely && bun install`
Expected: `node_modules` generated successfully.

- [ ] **Step 5: Commit**

```bash
git add guidely/package.json guidely/tsconfig.json guidely/vite.config.ts
git commit -m "chore: scaffold guidely-plus project"
```

### Task 2: Core Utilities and Converter

**Files:**
- Create: `guidely/src/utils.ts`
- Create: `guidely/src/converter.ts`

- [ ] **Step 1: Write `utils.ts`**

```typescript
export function onReady(callback: () => void) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(callback, 1);
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

export function enableCopy() {
  const style = document.createElement('style');
  style.innerHTML = `
    * {
      user-select: auto !important;
      -webkit-user-select: auto !important;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('contextmenu', (e) => e.stopPropagation(), true);
  document.addEventListener('copy', (e) => e.stopPropagation(), true);
  document.addEventListener('selectstart', (e) => e.stopPropagation(), true);
}

export function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Write `converter.ts`**

```typescript
import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}
```

- [ ] **Step 3: Commit**

```bash
git add guidely/src/utils.ts guidely/src/converter.ts
git commit -m "feat: add utils and markdown converter"
```

### Task 3: Crawler Logic

**Files:**
- Create: `guidely/src/crawler.ts`

- [ ] **Step 1: Write `crawler.ts`**

```typescript
import { htmlToMarkdown } from './converter';
import { downloadFile } from './utils';

// Wait helper
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function startCrawler() {
  let finalMarkdown = '# Guidely Mock Test\\n\\n';
  let hasNext = true;
  let qNum = 1;

  while (hasNext) {
    // Wait for content to render
    await sleep(2000);

    const questionEl = document.querySelector('.question-text'); // Adjust selector as per Guidely
    const optionsEl = document.querySelector('.options-container'); // Adjust selector
    const solutionEl = document.querySelector('.solution-container'); // Adjust selector

    if (questionEl) {
      finalMarkdown += `## Question ${qNum}\\n\\n${htmlToMarkdown(questionEl.innerHTML)}\\n\\n`;
      if (optionsEl) {
        finalMarkdown += `### Options\\n\\n${htmlToMarkdown(optionsEl.innerHTML)}\\n\\n`;
      }
      if (solutionEl) {
        finalMarkdown += `### Solution\\n\\n${htmlToMarkdown(solutionEl.innerHTML)}\\n\\n`;
      }
      finalMarkdown += '---\\n\\n';
      qNum++;
    }

    // Find next button
    const nextBtn = document.querySelector('button.next-btn:not([disabled])') as HTMLButtonElement | null;
    if (nextBtn) {
      nextBtn.click();
    } else {
      hasNext = false;
    }
  }

  downloadFile('guidely_mock_test.md', finalMarkdown);
}
```

- [ ] **Step 2: Commit**

```bash
git add guidely/src/crawler.ts
git commit -m "feat: implement test crawler"
```

### Task 4: UI Button and Entry Point

**Files:**
- Create: `guidely/src/ui.ts`
- Create: `guidely/src/main.ts`

- [ ] **Step 1: Write `ui.ts`**

```typescript
import { startCrawler } from './crawler';

export function injectUI() {
  const btn = document.createElement('button');
  btn.textContent = 'Export to MD';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 10px 20px;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-family: Arial, sans-serif;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  btn.addEventListener('click', () => {
    btn.textContent = 'Crawling...';
    btn.disabled = true;
    startCrawler().then(() => {
      btn.textContent = 'Export to MD';
      btn.disabled = false;
    }).catch(e => {
      console.error(e);
      btn.textContent = 'Error!';
    });
  });

  document.body.appendChild(btn);
}
```

- [ ] **Step 2: Write `main.ts`**

```typescript
import { onReady, enableCopy } from './utils';
import { injectUI } from './ui';

onReady(() => {
  enableCopy();
  injectUI();
});
```

- [ ] **Step 3: Run build to verify types and correctness**

Run: `cd guidely && bun run build`
Expected: Passes without errors and generates dist files.

- [ ] **Step 4: Commit**

```bash
git add guidely/src/ui.ts guidely/src/main.ts
git commit -m "feat: add ui button and main entry point"
```
