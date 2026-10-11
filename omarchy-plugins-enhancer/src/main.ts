import { catalogService } from "./catalog.ts";
import { autoPager } from "./features/auto-pager.ts";
import { enhanceAllCards } from "./features/card-enhancer.ts";
import { seenObserver } from "./features/seen-observer.ts";
import { STYLES } from "./styles.ts";
import { storage } from "./storage.ts";
import { Toolbar } from "./ui/toolbar.ts";

function injectStyles(): void {
  try {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(STYLES);
      return;
    }
  } catch {
    // Fallback
  }

  const styleEl = document.createElement("style");
  styleEl.id = "ope-custom-styles";
  styleEl.textContent = STYLES;
  (document.head || document.documentElement).appendChild(styleEl);
}

function handleDetailPage(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const pluginId = params.get("id");
    if (pluginId) {
      storage.markPluginSeen(pluginId);
    }
  } catch {
    // Ignore URL parse error
  }
}

function setupMutationObserver(): void {
  let debounceTimer = 0;

  const observer = new MutationObserver((mutations) => {
    let hasCardChanges = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.classList.contains("plugin-card") || node.querySelector(".plugin-card")) {
              hasCardChanges = true;
              break;
            }
          }
        }
      }
      if (hasCardChanges) break;
    }

    if (hasCardChanges) {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        enhanceAllCards();
        seenObserver.observeAll();
        autoPager.setupSentinel();
      }, 50);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function init(): void {
  injectStyles();

  // Set initial document classes for seenMode
  const settings = storage.getSettings();
  document.documentElement.classList.toggle("ope-mode-dim", settings.seenMode === "dim");
  document.documentElement.classList.toggle("ope-mode-collapse", settings.seenMode === "collapse");

  handleDetailPage();

  // Setup DOM listeners and enhance any existing cards immediately
  setupMutationObserver();
  enhanceAllCards();
  seenObserver.observeAll();
  autoPager.setupSentinel();
  autoPager.initObserver();

  // Render toolbar (starts collapsed by default)
  new Toolbar();

  // Asynchronously resolve catalog repository links in the background
  catalogService
    .getCatalog()
    .then(() => {
      enhanceAllCards();
    })
    .catch((err) => {
      console.warn("[Omarchy Enhancer] Catalog resolution error:", err);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => init());
} else {
  init();
}
