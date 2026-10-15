import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { getWishlist, clearWishlist } from "../core/wishlist";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../core/settings";
import { subscribeStorage } from "../core/storage";
import { ChatSession } from "../core/chat";
import { sortItems, type SortKey } from "../core/pricing";
import { ICON } from "../core/icons";
import { WishlistRow } from "./WishlistRow";
import { Toolbar } from "./Toolbar";
import { Settings } from "./Settings";
import { Chat } from "./Chat";
import { Icon, Toast, type ToastMessage } from "./shared";
type View = "wishlist" | "settings" | "chat" | null;
const identity = () => {
  const s = getSettings();
  return JSON.stringify([s.baseUrl, s.apiKey, s.model]);
};
export function WishlistApp() {
  const [data, setData] = useState(() => ({ items: getWishlist(), settings: getSettings() }));
  const [view, setView] = useState<View>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("dateAdded");
  const [platform, setPlatform] = useState("All");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [crawls, setCrawls] = useState(0);
  const session = useMemo(() => new ChatSession(), []);
  const provider = useRef(identity());
  const fab = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backTarget = useRef<HTMLElement | null>(null);
  const notify = useCallback((text: string, action?: () => void) => setToast({ text, action }), []);
  useLayoutEffect(() => {
    const unsubscribe = subscribeStorage(() => {
      const next = identity();
      if (next !== provider.current) {
        provider.current = next;
        session.invalidate();
      }
      setData({ items: getWishlist(), settings: getSettings() });
    });
    const failed = (event: Event) =>
      notify(`Could not save: ${(event as CustomEvent<string>).detail}`);
    const reset = () => {
      setView("settings");
      setConfirmReset(true);
    };
    const start = () => setCrawls((n) => n + 1),
      end = () => setCrawls((n) => Math.max(0, n - 1));
    window.addEventListener("storage-error", failed);
    window.addEventListener("aiw-reset-requested", reset);
    window.addEventListener("crawling-start", start);
    window.addEventListener("crawling-end", end);
    return () => {
      unsubscribe();
      session.invalidate();
      window.removeEventListener("storage-error", failed);
      window.removeEventListener("aiw-reset-requested", reset);
      window.removeEventListener("crawling-start", start);
      window.removeEventListener("crawling-end", end);
    };
  }, [session, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("aiw-panel-visibility", { detail: !!view }));
    if (view) {
      const candidates = panel.current?.querySelectorAll<HTMLElement>(
        confirmReset ? ".aiw-reset-overlay button" : "input,button",
      );
      Array.from(candidates ?? [])
        .find((element) => !element.closest("[inert]"))
        ?.focus();
    } else fab.current?.focus();
  }, [view, confirmReset]);
  const close = useCallback(() => {
    setView(null);
    setConfirmClear(false);
    setConfirmReset(false);
    fab.current?.focus();
  }, []);
  useEffect(() => {
    if (!view) return;
    const outside = (event: MouseEvent) => {
      if (
        !event
          .composedPath()
          .some((node) => node instanceof Element && node.classList.contains("aiw-app"))
      )
        close();
    };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, [view, close]);
  const back = () => {
    setView("wishlist");
    setConfirmReset(false);
    setTimeout(() => backTarget.current?.focus(), 0);
  };
  const openDrawer = (next: View, target: HTMLElement) => {
    backTarget.current = target;
    setView(next);
  };
  const items = sortItems(
    data.items.filter(
      (item) =>
        (platform === "All" || item.platform === platform) &&
        item.title.toLowerCase().includes(query.toLowerCase()),
    ),
    sort,
  );
  const accent = data.settings.accentColor;
  const rgb = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16));
  const light = `rgb(${rgb.map((v) => Math.round(v + (255 - v) * 0.92)).join(",")})`;
  const theme = {
    "--aiw-primary": accent,
    "--aiw-primary-rgb": rgb.join(","),
    "--aiw-primary-light": light,
    "--aiw-primary-hover": `rgb(${rgb.map((v) => Math.max(0, v - 30)).join(",")})`,
  };
  return (
    <div class="aiw-app" data-aiw-owned="">
      <button
        ref={fab}
        class={`aiw-fab ${crawls ? "crawling" : ""}`}
        style={{
          color: accent,
          "--aiw-fab-bg-from": light,
          "--aiw-fab-border": `rgba(${rgb.join(",")},0.2)`,
        }}
        aria-label={view ? "Close AI Wishlist" : "Open AI Wishlist"}
        aria-expanded={!!view}
        aria-controls="aiw-panel"
        onClick={() => (view ? close() : setView("wishlist"))}
      >
        <span class="aiw-fab-icon-wrap">
          <Icon svg={view ? ICON.close(28) : ICON.heart(28, "currentColor", "currentColor")} />
        </span>
        <span class="aiw-fab-crab">
          <Icon svg={ICON.crab(28, accent)} />
        </span>
        {data.items.length > 0 && <span class="aiw-fab-badge">{data.items.length}</span>}
      </button>
      {view && (
        <div
          id="aiw-panel"
          ref={panel}
          class="aiw-panel visible aiw-open"
          role="dialog"
          aria-modal="true"
          aria-label="AI Wishlist"
          style={theme}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              if (confirmReset) setConfirmReset(false);
              else if (view !== "wishlist") back();
              else close();
            }
            if (event.key === "Tab") {
              const focusable = Array.from(
                panel.current?.querySelectorAll<HTMLElement>(
                  "button:not([disabled]),input:not([disabled]),a[href]",
                ) ?? [],
              ).filter((el) => !el.closest("[inert]"));
              const first = focusable[0],
                last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div inert={view !== "wishlist" || confirmReset} class="aiw-dashboard">
            <header class="aiw-header">
              <div class="aiw-title-wrap">
                <h1 class="aiw-title">AI Wishlist</h1>
                <span class="aiw-count-badge">{data.items.length}</span>
              </div>
              <div class="aiw-header-actions">
                <button
                  class="aiw-header-btn aiw-ai"
                  aria-label="AI Chat"
                  onClick={(event) => openDrawer("chat", event.currentTarget)}
                >
                  <Icon svg={ICON.heart(18, "none", "currentColor")} />
                </button>
                <button
                  class="aiw-header-btn aiw-settings"
                  aria-label="Settings"
                  onClick={(event) => openDrawer("settings", event.currentTarget)}
                >
                  <Icon svg={ICON.settings(18)} />
                </button>
                <button
                  class="aiw-header-btn aiw-close"
                  aria-label="Close wishlist"
                  onClick={close}
                >
                  <Icon svg={ICON.close(18)} />
                </button>
              </div>
            </header>
            <Toolbar
              query={query}
              setQuery={setQuery}
              sort={sort}
              setSort={setSort}
              platform={platform}
              setPlatform={setPlatform}
            />
            <div class="aiw-list-container">
              {!data.items.length ? (
                <div class="aiw-empty-state">
                  <Icon svg={ICON.emptyHeart(48)} />
                  <p class="aiw-empty-msg">
                    Your AI wishlist is empty.
                    <br />
                    Click a product’s heart to save it.
                  </p>
                </div>
              ) : !items.length ? (
                <p class="aiw-empty-msg">No items match your filters.</p>
              ) : (
                items.map((item) => <WishlistRow key={item.id} item={item} notify={notify} />)
              )}
            </div>
            <div class="aiw-floating-pills">
              <button
                class="aiw-pill-btn copy"
                disabled={!data.items.length}
                onClick={async () => {
                  try {
                    const exported = data.items.map((item) => {
                      let details: unknown = item.details ?? null;
                      try {
                        details = JSON.parse(item.details ?? "null");
                      } catch {
                        /* Export original malformed details for inspection. */
                      }
                      return { ...item, details };
                    });
                    await navigator.clipboard.writeText(JSON.stringify(exported, null, 2));
                    notify("Copied to clipboard as JSON");
                  } catch {
                    notify("Could not copy JSON. Check clipboard permission.");
                  }
                }}
              >
                <Icon svg={ICON.clipboard(13)} />
                Copy JSON
              </button>
              <button
                class={`aiw-pill-btn clear ${confirmClear ? "confirming" : ""}`}
                disabled={!data.items.length}
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  if (clearWishlist()) {
                    session.clear();
                    notify("Wishlist cleared");
                  }
                  setConfirmClear(false);
                }}
              >
                <Icon svg={ICON.trash(13)} />
                {confirmClear ? "Confirm Clear?" : "Clear All"}
              </button>
            </div>
          </div>
          {view === "settings" && (
            <div inert={confirmReset}>
              <Settings
                settings={data.settings}
                onBack={back}
                notify={notify}
                onReset={() => setConfirmReset(true)}
              />
            </div>
          )}
          {view === "chat" && (
            <Chat
              session={session}
              settings={data.settings}
              items={data.items}
              onBack={back}
              notify={notify}
            />
          )}
          {confirmReset && (
            <div
              class="aiw-reset-overlay"
              role="alertdialog"
              aria-modal="true"
              aria-label="Reset all data"
            >
              <h2>Reset all data?</h2>
              <p>This removes saved products, specifications, settings and chat history.</p>
              <button
                class="aiw-sub-btn danger"
                onClick={() => {
                  if (!clearWishlist()) return;
                  session.clear();
                  if (saveSettings({ ...DEFAULT_SETTINGS })) {
                    setConfirmReset(false);
                    notify("All data reset");
                  }
                }}
              >
                Confirm reset
              </button>
              <button class="aiw-sub-btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
