import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";
import { render } from "preact";
import { filterDbk, lookupDbk, type Scheme } from "./dbk-data";

declare const GM_xmlhttpRequest: (options: {
  method: string;
  url: string;
  headers: Record<string, string>;
  data: string;
  timeout: number;
  onload: (response: { status: number; responseText: string }) => void;
  onerror: () => void;
  ontimeout: () => void;
}) => void;
declare const unsafeWindow: Window & {
  $find?: (id: string) => { dispose(): void } | null;
};

const cache = new Map<string, { rows: Scheme[]; expires: number }>();
const attached = new Map<HTMLInputElement, () => void>();
const dbkSelector = 'input[id$="tbProduct_TabPanel1_txtDBKSchNo"]';
const ritcSelector = 'input[id$="tbProduct_TabPanel1_txtRitccode"]';

function post(url: string, body: string): Promise<unknown> {
  return new Promise((resolve, reject) =>
    GM_xmlhttpRequest({
      method: "POST",
      url,
      data: body,
      timeout: 15000,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      onload: (response) => {
        try {
          if (response.status < 200 || response.status >= 300)
            throw new Error("Request failed");
          resolve(JSON.parse(response.responseText));
        } catch (error) {
          reject(error);
        }
      },
      onerror: () => reject(new Error("Network error")),
      ontimeout: () => reject(new Error("Request timed out")),
    }),
  );
}

function attach(input: HTMLInputElement) {
  if (attached.has(input)) return;

  const host = document.createElement("div");
  host.className = "bic-dbk-popup";
  host.hidden = true;
  host.id = `bic-dbk-${Math.random().toString(36).slice(2)}`;
  document.body.append(host);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", host.id);
  input.setAttribute("aria-expanded", "false");
  let rows: Scheme[] = [];
  let active = -1;
  let currentRitc = "";
  let state = "";
  let request = 0;
  let cleanup: (() => void) | undefined;
  let nativeDisposed = false;
  let selecting = false;
  let blurTimer: ReturnType<typeof setTimeout> | undefined;
  const getRitc = () =>
    document.querySelector<HTMLInputElement>(ritcSelector)?.value.trim() ?? "";

  function close() {
    clearTimeout(blurTimer);
    blurTimer = undefined;
    host.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    cleanup?.();
    cleanup = undefined;
  }
  function select(row: Scheme) {
    if (input.disabled || input.readOnly || getRitc() !== currentRitc)
      return close();
    input.value = row.code;
    close();
    selecting = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    selecting = false;
  }
  function draw() {
    if (host.hidden) return;
    const visible = filterDbk(rows, input.value);
    if (active >= visible.length) active = visible.length - 1;
    render(
      <div class="bic-dbk-list" role="listbox" aria-label="DBK schemes">
        {state ? (
          <div class="bic-dbk-message" role="status">
            {state}
          </div>
        ) : visible.length === 0 ? (
          <div class="bic-dbk-message" role="status">
            No matching DBK schemes
          </div>
        ) : (
          visible.map((row, index) => (
            <div
              id={`${host.id}-${index}`}
              key={row.code}
              role="option"
              tabIndex={-1}
              aria-selected={active === index}
              class={`bic-dbk-option ${active === index ? "is-active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                select(row);
              }}
            >
              <span class="bic-dbk-code">{row.code}</span>
              <span class="bic-dbk-description">{row.description}</span>
              <span class="bic-dbk-rate">{row.rate ? `${row.rate}%` : ""}</span>
            </div>
          ))
        )}
      </div>,
      host,
    );
    if (active >= 0 && visible[active])
      input.setAttribute("aria-activedescendant", `${host.id}-${active}`);
    else input.removeAttribute("aria-activedescendant");
  }
  async function refresh() {
    const ritc = getRitc();
    const serial = ++request;
    currentRitc = ritc;
    active = -1;
    rows = [];
    if (!/^\d{8}$/.test(ritc)) {
      state = "Enter an 8-digit RITC number first";
      draw();
      return;
    }
    const saved = cache.get(ritc);
    if (saved && saved.expires > Date.now()) {
      rows = saved.rows;
      state = "";
      draw();
      return;
    }
    state = "Loading DBK schemes…";
    draw();
    try {
      const found = await lookupDbk(ritc, post);
      if (serial !== request || getRitc() !== ritc || !input.isConnected)
        return;
      cache.set(ritc, { rows: found, expires: Date.now() + 5 * 60_000 });
      rows = found;
      state = found.length ? "" : "No DBK schemes found for this RITC";
    } catch {
      if (serial !== request || getRitc() !== ritc) return;
      state = "Could not load DBK schemes. Reopen to retry.";
    }
    draw();
  }
  function open() {
    if (input.disabled || input.readOnly) return;
    clearTimeout(blurTimer);
    blurTimer = undefined;
    if (!nativeDisposed) {
      const id = input.id.replace(/txtDBKSchNo$/, "AutoCompleteExtender3");
      const behavior = unsafeWindow.$find?.(id);
      if (behavior) {
        behavior.dispose();
        nativeDisposed = true;
      }
    }
    host.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (!cleanup)
      cleanup = autoUpdate(input, host, () => {
        void computePosition(input, host, {
          placement: "bottom-start",
          strategy: "fixed",
          middleware: [
            offset(4),
            flip(),
            shift({ padding: 8 }),
            size({
              padding: 8,
              apply({ availableWidth, rects, elements }) {
                elements.floating.style.width = `${Math.min(Math.max(rects.reference.width, 330), availableWidth)}px`;
              },
            }),
          ],
        }).then(({ x, y }) => {
          Object.assign(host.style, { left: `${x}px`, top: `${y}px` });
        });
      });
    void refresh();
  }
  input.addEventListener("focus", open);
  input.addEventListener("input", () => {
    if (selecting) return;
    if (host.hidden) open();
    else if (getRitc() !== currentRitc) void refresh();
    else {
      active = -1;
      draw();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown" && host.hidden) {
      event.preventDefault();
      open();
      return;
    }
    if (host.hidden) return;
    const visible = filterDbk(rows, input.value);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      active = Math.max(
        0,
        Math.min(
          visible.length - 1,
          active + (event.key === "ArrowDown" ? 1 : -1),
        ),
      );
      draw();
      host.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && active >= 0 && visible[active]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      select(visible[active]);
    } else if (event.key === "Tab") close();
  });
  input.addEventListener("focus", open);
  input.addEventListener("blur", () => {
    blurTimer = setTimeout(close, 120);
  });
  const outside = (event: Event) => {
    if (event.target !== input && !host.contains(event.target as Node)) close();
  };
  const ritcChanged = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.matches(ritcSelector) &&
      !host.hidden
    )
      void refresh();
  };
  document.addEventListener("pointerdown", outside);
  document.addEventListener("input", ritcChanged);
  document.addEventListener("change", ritcChanged);
  attached.set(input, () => {
    clearTimeout(blurTimer);
    request++;
    close();
    render(null, host);
    host.remove();
    document.removeEventListener("pointerdown", outside);
    document.removeEventListener("input", ritcChanged);
    document.removeEventListener("change", ritcChanged);
  });
}

export function installDbk() {
  const style = document.createElement("style");
  style.textContent = `.bic-dbk-popup{position:fixed;z-index:2147483000;font:13px/1.35 system-ui,sans-serif;color:#192e3a}.bic-dbk-popup[hidden]{display:none}.bic-dbk-list{max-height:250px;overflow:auto;background:#fff;border:1px solid #b8cbd1;border-radius:5px;box-shadow:0 8px 24px #183c4a26}.bic-dbk-option{display:grid;grid-template-columns:76px 1fr auto;gap:10px;padding:9px 10px;cursor:pointer;border-bottom:1px solid #edf2f3}.bic-dbk-option:hover,.bic-dbk-option.is-active{background:#e8f4f2}.bic-dbk-code{font-weight:700;color:#14574f;font-variant-numeric:tabular-nums}.bic-dbk-description{overflow-wrap:anywhere}.bic-dbk-rate{font-variant-numeric:tabular-nums;color:#49636b}.bic-dbk-message{padding:12px;color:#526a72}`;
  document.head.append(style);
  const scan = () =>
    document.querySelectorAll<HTMLInputElement>(dbkSelector).forEach(attach);
  scan();
  new MutationObserver((mutations) => {
    for (const [input, dispose] of attached) {
      if (!input.isConnected) {
        dispose();
        attached.delete(input);
      }
    }
    if (
      mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches(dbkSelector) || node.querySelector(dbkSelector)),
        ),
      )
    )
      scan();
  }).observe(document.body, { childList: true, subtree: true });
}
