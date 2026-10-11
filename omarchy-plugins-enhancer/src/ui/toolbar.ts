import { ICONS } from "../icons.ts";
import { storage } from "../storage.ts";
import type { SeenMode } from "../types.ts";

export class Toolbar {
  private container: HTMLElement | null = null;
  private isCollapsed: boolean = true;

  constructor() {
    this.createToolbar();
    this.syncWithSettings();

    storage.onSettingsChange(() => {
      this.syncWithSettings();
    });
  }

  private createToolbar(): void {
    if (typeof document === "undefined") return;
    if (document.querySelector(".ope-toolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.className = "ope-toolbar collapsed";
    toolbar.setAttribute("role", "region");
    toolbar.setAttribute("aria-label", "Catalog Enhancer Controls");

    toolbar.innerHTML = `
      <div class="ope-toolbar-body">
        <button type="button" class="ope-btn" id="ope-toggle-autopager" title="Toggle Auto Pager">
          ${ICONS.bolt} <span class="ope-label">Auto Pager</span>
        </button>

        <div class="ope-mode-group" role="group" aria-label="Seen Mode">
          <button type="button" class="ope-mode-btn" data-mode="dim" title="Grey out seen plugins">
            ${ICONS.eye} <span>Dim</span>
          </button>
          <button type="button" class="ope-mode-btn" data-mode="collapse" title="Collapse seen plugins to strip">
            ${ICONS.strip} <span>Hide</span>
          </button>
          <button type="button" class="ope-mode-btn" data-mode="off" title="Do not alter seen plugins">
            ${ICONS.eyeOff} <span>Off</span>
          </button>
        </div>

        <button type="button" class="ope-clear-btn" id="ope-clear-seen" title="Reset seen plugins history">
          ${ICONS.trash} <span id="ope-seen-count">0</span>
        </button>
      </div>

      <button type="button" class="ope-collapse-btn" id="ope-collapse-toggle" title="Expand Controls">
        ${ICONS.settings}
      </button>
    `;

    document.body.appendChild(toolbar);
    this.container = toolbar;

    // 1. Auto Pager toggle listener
    const autoPagerBtn = toolbar.querySelector<HTMLButtonElement>("#ope-toggle-autopager");
    autoPagerBtn?.addEventListener("click", () => {
      const current = storage.getSettings().autoPagerEnabled;
      storage.updateSettings({ autoPagerEnabled: !current });
    });

    // 2. Seen Mode segmented listeners (dim, collapse, off)
    const modeButtons = toolbar.querySelectorAll<HTMLButtonElement>(".ope-mode-btn");
    for (const btn of modeButtons) {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.mode as SeenMode;
        if (mode) {
          storage.updateSettings({ seenMode: mode });
        }
      });
    }

    // 3. Clear seen listener
    const clearBtn = toolbar.querySelector<HTMLButtonElement>("#ope-clear-seen");
    clearBtn?.addEventListener("click", () => {
      const count = storage.getSeenCount();
      if (count === 0) return;
      if (window.confirm(`Reset ${count} seen plugin${count > 1 ? "s" : ""}?`)) {
        storage.clearSeenPlugins();
        const cards = document.querySelectorAll<HTMLElement>(".plugin-card.ope-seen");
        for (const card of cards) {
          card.classList.remove("ope-seen");
          card.removeAttribute("data-ope-seen");
          const badge = card.querySelector<HTMLElement>(".ope-seen-badge");
          if (badge) {
            badge.classList.remove("is-seen");
            badge.innerHTML = ICONS.eye;
          }
        }
      }
    });

    // 4. Collapse toolbar listener
    const collapseBtn = toolbar.querySelector<HTMLButtonElement>("#ope-collapse-toggle");
    collapseBtn?.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      toolbar.classList.toggle("collapsed", this.isCollapsed);
      collapseBtn.title = this.isCollapsed ? "Expand Controls" : "Collapse Controls";
    });
  }

  public syncWithSettings(): void {
    if (!this.container) return;

    const settings = storage.getSettings();

    // Toggle document class for seen modes
    document.documentElement.classList.toggle("ope-mode-dim", settings.seenMode === "dim");
    document.documentElement.classList.toggle("ope-mode-collapse", settings.seenMode === "collapse");

    // Update Auto Pager button state
    const autoPagerBtn = this.container.querySelector<HTMLButtonElement>("#ope-toggle-autopager");
    if (autoPagerBtn) {
      autoPagerBtn.classList.toggle("active", settings.autoPagerEnabled);
    }

    // Update mode buttons state
    const modeButtons = this.container.querySelectorAll<HTMLButtonElement>(".ope-mode-btn");
    for (const btn of modeButtons) {
      btn.classList.toggle("active", btn.dataset.mode === settings.seenMode);
    }

    // Update Seen count
    const countSpan = this.container.querySelector<HTMLElement>("#ope-seen-count");
    if (countSpan) {
      const count = storage.getSeenCount();
      countSpan.textContent = String(count);
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
