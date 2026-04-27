# Minimal "Floating Orbit" UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing testbook downloader UI with a beautiful, minimal, SVG-only "floating orbit" button that auto-hides gracefully.

**Architecture:** We will completely rewrite the `DownloaderUI` class in `src/ui.ts` to manage state explicitly (idle, loading, success) and use a unified style application method to eliminate CSS string manipulation redundancy. The element will rely heavily on CSS transitions (`transform`, `scale`) for performance and a glassmorphic aesthetic.

**Tech Stack:** TypeScript, Vanilla DOM API, CSS (Backdrop-filter, Transitions).

---

### Task 1: Rewrite DownloaderUI State Management and Styling

**Files:**
- Modify: `src/ui.ts`

- [ ] **Step 1: Replace the entire `src/ui.ts` file with the new structure**

We'll define the base structure, CSS variables, and the `applyState` method. We'll add the SVGs in the next step to keep the file size manageable.

```typescript
type UIState = 'idle' | 'loading' | 'success';

export class DownloaderUI {
  private container: HTMLDivElement;
  private currentState: UIState = 'idle';

  // SVG Definitions
  private readonly svgIdle = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>\`;
  private readonly svgLoading = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"></circle><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>\`;
  private readonly svgSuccess = \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><polyline points="20 6 9 17 4 12"></polyline></svg>\`;

  constructor(private onStart: () => void) {
    this.container = document.createElement('div');
    this.initStyles();
    this.setupEvents();
    this.applyState('idle');
  }

  private initStyles() {
    this.container.style.cssText = \`
      position: fixed;
      bottom: 32px;
      right: 16px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #ffffff;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    \`;

    // Ensure spin animation exists
    if (!document.getElementById('tb-dl-styles')) {
      const style = document.createElement('style');
      style.id = 'tb-dl-styles';
      style.textContent = \`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      \`;
      document.head.appendChild(style);
    }
  }

  private applyState(state: UIState, isHover: boolean = false) {
    this.currentState = state;

    if (state === 'idle') {
      if (isHover) {
        this.container.style.transform = 'translateX(0) scale(1)';
        this.container.style.background = 'rgba(0, 0, 0, 0.8)';
        this.container.style.pointerEvents = 'auto';
        this.container.innerHTML = this.svgIdle;
      } else {
        // Tucked away, scale down, slide right
        this.container.style.transform = 'translateX(36px) scale(0.6)';
        this.container.style.background = 'rgba(0, 0, 0, 0.4)';
        this.container.style.pointerEvents = 'auto'; // Keep clickable to trigger hover
        this.container.innerHTML = this.svgIdle;
      }
    } else if (state === 'loading') {
      this.container.style.transform = 'translateX(0) scale(1)';
      this.container.style.background = 'rgba(0, 0, 0, 0.6)';
      this.container.style.pointerEvents = 'none';
      this.container.innerHTML = this.svgLoading;
    } else if (state === 'success') {
      this.container.style.transform = 'translateX(0) scale(1.1)';
      this.container.style.background = 'rgba(16, 185, 129, 0.9)';
      this.container.style.pointerEvents = 'none';
      this.container.innerHTML = this.svgSuccess;
    }
  }

  private setupEvents() {
    this.container.addEventListener('mouseenter', () => {
      if (this.currentState === 'idle') this.applyState('idle', true);
    });
    
    this.container.addEventListener('mouseleave', () => {
      if (this.currentState === 'idle') this.applyState('idle', false);
    });

    this.container.addEventListener('click', () => {
      if (this.currentState === 'idle') {
        this.applyState('loading');
        this.onStart();
      }
    });
  }

  public mount() {
    document.body.appendChild(this.container);
  }

  public updateStatus(msg: string) {
    // Minimal UI does not display status text
  }

  public finish() {
    this.applyState('success');
    setTimeout(() => {
      this.applyState('idle');
    }, 3000);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.ts
git commit -m "feat(ui): implement minimal floating orbit design"
```

### Task 2: Verify Build and Integration

**Files:**
- Test: Build output

- [ ] **Step 1: Run the build command**

Run: `npm run build` or `npx tsc` (depending on `package.json` setup) to verify `src/ui.ts` compiles correctly and integrates with `src/main.ts` without type errors. Since `testbook-downloader` has a `package.json`, we should check its scripts.

Run: `cat package.json | grep build`
Expected: Output showing the build script.

Run: `npm run build` (or the appropriate build command found above)
Expected: Successful build with no TS errors.

- [ ] **Step 2: Commit (if any fixes were needed during build)**

```bash
git add .
git commit -m "fix(ui): resolve build issues with new UI"
```
