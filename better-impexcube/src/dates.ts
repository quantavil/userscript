import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const format = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

function parse(value: string): Date | null {
  const text = value.trim().toLowerCase();
  if (text === "today" || /^[+-]\d+$/.test(text)) {
    const result = new Date();
    if (text !== "today") result.setDate(result.getDate() + Number(text));
    return result;
  }
  let day: number, month: number, year: number;
  const compact = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  const numeric = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  const named = text.match(
    /^(\d{1,2})[\s./-]*([a-z]+)(?:[\s,./-]+(\d{2}|\d{4}))?$/,
  );
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const parts = compact || numeric;
  if (parts) {
    day = Number(parts[1]);
    month = Number(parts[2]) - 1;
    year = Number(parts[3]);
  } else if (named) {
    day = Number(named[1]);
    month = months.findIndex((m) => named[2]?.startsWith(m.toLowerCase()));
    year = named[3] ? Number(named[3]) : new Date().getFullYear();
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
    day = Number(iso[3]);
  } else return null;
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const result = new Date(year, month, day);
  return year >= 1900 &&
    year <= 2100 &&
    result.getFullYear() === year &&
    result.getMonth() === month &&
    result.getDate() === day
    ? result
    : null;
}

export function installDates(): void {
  const style = document.createElement("style");
  style.textContent = `
    .impex-date-wrapper{display:inline-flex;align-items:center;gap:3px}
    .impex-date-btn{cursor:pointer;background:#fff;border:1px solid #9baeb2;border-radius:3px;padding:2px 5px}
    .impex-date-btn:disabled{opacity:.5;cursor:not-allowed}
    .impex-date-input.invalid{outline:2px solid #b64b4b}
    .impex-calendar-popup{position:fixed;z-index:2147483000;width:238px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:8px;background:#fff;border:1px solid #c8d6df;border-radius:10px;box-shadow:0 12px 32px #1c3c512b;font:12px/1.4 system-ui,sans-serif;color:#203849;font-variant-numeric:tabular-nums}
    .impex-calendar-popup[hidden]{display:none}
    .impex-calendar-popup button{box-sizing:border-box;min-width:0;margin:0;border:0;background:transparent;color:inherit;font:inherit;line-height:1;cursor:pointer;box-shadow:none;text-shadow:none}
    .impex-cal-header{display:grid;grid-template-columns:26px 26px minmax(0,1fr) 26px 26px;align-items:center;text-align:center}
    .impex-cal-title{font-weight:700;white-space:nowrap}
    .impex-calendar-popup .impex-cal-nav{width:26px;height:26px;padding:0;border-radius:4px;font-size:16px}
    .impex-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;margin:5px 0}
    .impex-cal-grid>span{display:grid;place-items:center;height:22px;color:#687d8a;font-size:11px;font-weight:600}
    .impex-calendar-popup .impex-cal-day{display:grid;place-items:center;width:100%;height:28px;padding:0;border-radius:4px}
    .impex-calendar-popup .impex-cal-day.other-month{color:#9baab2}
    .impex-calendar-popup .impex-cal-day.today:not(.selected){box-shadow:inset 0 0 0 1px #548a83;color:#176b62;font-weight:700}
    .impex-calendar-popup .impex-cal-day.selected{background:#217d72;color:#fff;font-weight:700}
    .impex-quick-btns{display:flex;justify-content:center;gap:6px;padding-top:5px;border-top:1px solid #e5ecef}
    .impex-calendar-popup .impex-quick-btn{padding:6px 9px;border-radius:4px;color:#176b62;font-weight:600}
    .impex-calendar-popup button:hover:not(.selected){background:#eaf4f2}
    .impex-calendar-popup button:focus-visible{outline:2px solid #217d72;outline-offset:1px}
  `;
  document.head.append(style);
  const popup = document.createElement("div");
  popup.className = "impex-calendar-popup";
  popup.hidden = true;
  document.body.append(popup);
  let active: HTMLInputElement | null = null;
  let cleanup: (() => void) | undefined;
  const close = () => {
    popup.hidden = true;
    active = null;
    cleanup?.();
    cleanup = undefined;
  };
  const setDate = (date: Date) => {
    if (!active || active.disabled || active.readOnly) return;
    const input = active;
    input.value = format(date);
    input.classList.remove("invalid");
    close();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  const render = (view: Date) => {
    const year = view.getFullYear(),
      month = view.getMonth();
    popup.replaceChildren();
    const header = document.createElement("div");
    header.className = "impex-cal-header";
    for (const [label, action, delta] of [
      ["«", "prev-year", -12],
      ["‹", "prev-month", -1],
      ["›", "next-month", 1],
      ["»", "next-year", 12],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "impex-cal-nav";
      button.dataset.action = action;
      button.textContent = label;
      button.setAttribute("aria-label", action.replace("-", " "));
      button.addEventListener("click", () =>
        render(new Date(year, month + delta, 1)),
      );
      if (action === "next-month") {
        const title = document.createElement("span");
        title.className = "impex-cal-title";
        title.textContent = `${months[month]} ${year}`;
        header.append(title);
      }
      header.append(button);
    }
    const grid = document.createElement("div");
    grid.className = "impex-cal-grid";
    for (const day of ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]) {
      const label = document.createElement("span");
      label.textContent = day;
      grid.append(label);
    }
    const first = new Date(year, month, 1).getDay();
    const count =
      Math.ceil((first + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    for (let i = 0; i < count; i++) {
      const date = new Date(year, month, i - first + 1),
        button = document.createElement("button");
      button.type = "button";
      button.className = "impex-cal-day";
      button.textContent = String(date.getDate());
      button.dataset.date = format(date);
      button.setAttribute("aria-label", format(date));
      if (date.getMonth() !== month) button.classList.add("other-month");
      if (format(date) === format(new Date())) button.classList.add("today");
      if (
        active &&
        format(date) === format(parse(active.value) ?? new Date(1900, 0, 1))
      )
        button.classList.add("selected");
      button.addEventListener("click", () => setDate(date));
      grid.append(button);
    }
    const shortcuts = document.createElement("div");
    shortcuts.className = "impex-quick-btns";
    for (const [label, delta] of [
      ["Today", 0],
      ["Yesterday", -1],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "impex-quick-btn";
      button.textContent = label;
      button.addEventListener("click", () => {
        const date = new Date();
        date.setDate(date.getDate() + delta);
        setDate(date);
      });
      shortcuts.append(button);
    }
    popup.append(header, grid, shortcuts);
  };
  const show = (input: HTMLInputElement, button: HTMLButtonElement) => {
    if (input.disabled || input.readOnly) return;
    if (active === input && !popup.hidden) {
      close();
      return;
    }
    close();
    active = input;
    popup.hidden = false;
    render(parse(input.value) ?? new Date());
    cleanup = autoUpdate(button, popup, () => {
      void computePosition(button, popup, {
        strategy: "fixed",
        placement: "bottom-start",
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) =>
        Object.assign(popup.style, { left: `${x}px`, top: `${y}px` }),
      );
    });
  };
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (
      active &&
      !popup.contains(target) &&
      target !== active &&
      !(target instanceof Element && target.closest(".impex-date-btn"))
    )
      close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  const controls = new WeakSet<HTMLInputElement>();
  const scan = () => {
    document.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      if (controls.has(input) || !["text", "date"].includes(input.type)) return;
      if (
        !/date/i.test(`${input.id} ${input.name} ${input.placeholder}`) &&
        !input.classList.contains("hasDatepicker") &&
        !input.getAttribute("onblur")?.includes("IsValidDate")
      )
        return;
      if (input.type === "date") return;
      controls.add(input);
      input.classList.add("impex-date-input");
      input.removeAttribute("maxlength");
      const wrapper = document.createElement("span");
      wrapper.className = "impex-date-wrapper";
      input.before(wrapper);
      wrapper.append(input);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "impex-date-btn";
      button.textContent = "📅";
      button.setAttribute("aria-label", "Open calendar");
      wrapper.append(button);
      const sync = () => {
        button.disabled = input.disabled || input.readOnly;
        if (button.disabled && active === input) close();
      };
      new MutationObserver(sync).observe(input, {
        attributes: true,
        attributeFilter: ["disabled", "readonly"],
      });
      sync();
      button.addEventListener("click", () => show(input, button));
      const keyFilter = input.getAttribute("onkeypress") ?? "";
      if (/\b(?:isNumberDateKey|EnterDate)\s*\(/i.test(keyFilter)) {
        input.addEventListener(
          "keypress",
          (event) => {
            if (/^[a-z+ -]$/i.test(event.key)) event.stopImmediatePropagation();
          },
          true,
        );
      }
      const normalize = () => {
        if (!input.value.trim() || input.readOnly || input.disabled) return;
        const date = parse(input.value);
        if (date) {
          input.value = format(date);
          input.classList.remove("invalid");
        } else input.classList.add("invalid");
      };
      input.addEventListener("change", normalize, true);
      input.addEventListener("blur", normalize, true);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        if (input.disabled || input.readOnly) return;
        const date = parse(input.value) ?? new Date();
        date.setDate(date.getDate() + (event.key === "ArrowUp" ? 1 : -1));
        input.value = format(date);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        event.preventDefault();
      });
    });
    if (active && !active.isConnected) close();
  };
  scan();
  new MutationObserver((mutations) => {
    if (
      mutations.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches("input") || node.querySelector("input")),
        ),
      )
    )
      scan();
  }).observe(document.body, { childList: true, subtree: true });
}
