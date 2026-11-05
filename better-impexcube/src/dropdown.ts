import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/dom";

type Option = {
  element: HTMLOptionElement;
  text: string;
  value: string;
  disabled: boolean;
};

function score(text: string, query: string): number {
  text = text.toLocaleLowerCase();
  if (!query) return 1;
  if (text === query) return 100;
  if (text.startsWith(query)) return 80;
  if (text.includes(query)) return 60;
  let position = -1;
  for (const char of query) {
    position = text.indexOf(char, position + 1);
    if (position < 0) return 0;
  }
  return 10;
}

function enhance(select: HTMLSelectElement): () => void {
  const previousTabIndex = select.getAttribute("tabindex");
  const previousAriaHidden = select.getAttribute("aria-hidden");
  const wrapper = document.createElement("span");
  wrapper.className = "bd-wrapper";
  wrapper.style.width = select.style.width || "";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "bd-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  select.before(wrapper);
  wrapper.append(select, trigger);
  select.classList.add("bd-enhanced");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  const popup = document.createElement("div");
  popup.className = "bd-dropdown";
  popup.hidden = true;
  const search = document.createElement("input");
  search.type = "text";
  search.className = "bd-search";
  search.placeholder = "Type to search...";
  search.setAttribute("aria-label", "Search options");
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-expanded", "true");
  search.setAttribute("aria-autocomplete", "list");
  const list = document.createElement("div");
  list.className = "bd-options";
  list.setAttribute("role", "listbox");
  list.id = `bic-options-${Math.random().toString(36).slice(2)}`;
  search.setAttribute("aria-controls", list.id);
  popup.append(search, list);
  document.body.append(popup);

  let options: Option[] = [];
  let visible: Option[] = [];
  let active = -1;
  let cleanup: (() => void) | undefined;
  let open = false;
  const sync = () => {
    options = Array.from(select.options, (element) => ({
      element,
      value: element.value,
      text: element.textContent?.trim() ?? "",
      disabled:
        element.disabled ||
        (element.parentElement?.tagName === "OPTGROUP" &&
          (element.parentElement as HTMLOptGroupElement).disabled),
    }));
    trigger.textContent =
      select.selectedOptions[0]?.textContent?.trim() || "--Choose--";
    trigger.title = trigger.textContent;
    trigger.disabled = select.matches(":disabled");
    wrapper.hidden = select.hidden || select.style.display === "none";
    wrapper.style.width = select.style.width || "";
    wrapper.classList.toggle("bd-sized", !!select.style.width);
    trigger.style.font = getComputedStyle(select).font;
    if (trigger.disabled && open) close(false);
  };
  const draw = () => {
    const query = search.value.trim().toLocaleLowerCase();
    visible = options
      .map((option, index) => ({
        option,
        index,
        rank: Math.max(score(option.text, query), score(option.value, query)),
      }))
      .filter((item) => item.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.index - b.index)
      .map((item) => item.option);
    if (active < 0 || active >= visible.length || visible[active]?.disabled)
      active = visible.findIndex((item) => !item.disabled);
    list.replaceChildren();
    if (!visible.length) {
      list.textContent = "No matches found";
      return;
    }
    visible.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = `bd-option${index === active ? " bd-highlighted" : ""}`;
      row.id = `${list.id}-${index}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(item.element.selected));
      row.setAttribute("aria-disabled", String(item.disabled));
      const text = document.createElement("span");
      text.textContent = item.text;
      row.append(text);
      if (item.value && item.value !== item.text && item.value.length <= 15) {
        const code = document.createElement("small");
        code.textContent = item.value;
        row.append(code);
      }
      row.addEventListener("mousedown", (event) => {
        event.preventDefault();
        choose(item);
      });
      list.append(row);
    });
    if (active >= 0)
      search.setAttribute("aria-activedescendant", `${list.id}-${active}`);
    else search.removeAttribute("aria-activedescendant");
  };
  const close = (focus: boolean) => {
    if (!open) return;
    open = false;
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    cleanup?.();
    cleanup = undefined;
    if (focus && trigger.isConnected && !trigger.disabled) trigger.focus();
  };
  const choose = (item: Option) => {
    if (select.disabled || item.disabled || !item.element.isConnected) return;
    const changed = !item.element.selected;
    item.element.selected = true;
    close(true);
    sync();
    if (changed) {
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };
  const show = () => {
    sync();
    if (select.disabled) return;
    open = true;
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    active = -1;
    draw();
    cleanup = autoUpdate(trigger, popup, () => {
      void computePosition(trigger, popup, {
        strategy: "fixed",
        placement: "bottom-start",
        middleware: [
          offset(3),
          flip(),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply({ rects, availableWidth, elements }) {
              elements.floating.style.width = `${Math.min(Math.max(rects.reference.width, 240), availableWidth)}px`;
            },
          }),
        ],
      }).then(({ x, y }) =>
        Object.assign(popup.style, { left: `${x}px`, top: `${y}px` }),
      );
    });
    search.focus();
  };
  trigger.addEventListener("click", () => (open ? close(true) : show()));
  search.addEventListener("input", () => {
    active = -1;
    draw();
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") close(false);
    else if (event.key === "Enter") {
      event.preventDefault();
      const item = visible[active];
      if (item) choose(item);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      let next = active + direction;
      while (next >= 0 && next < visible.length && visible[next]?.disabled)
        next += direction;
      if (next >= 0 && next < visible.length) active = next;
      draw();
      list.children[active]?.scrollIntoView({ block: "nearest" });
    }
  });
  const outside = (event: Event) => {
    if (
      !wrapper.contains(event.target as Node) &&
      !popup.contains(event.target as Node)
    )
      close(false);
  };
  const onChange = () => {
    sync();
    if (open) draw();
  };
  document.addEventListener("pointerdown", outside);
  select.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(select, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });
  sync();
  return () => {
    observer.disconnect();
    cleanup?.();
    document.removeEventListener("pointerdown", outside);
    select.removeEventListener("change", onChange);
    wrapper.before(select);
    wrapper.remove();
    popup.remove();
    select.classList.remove("bd-enhanced");
    if (previousAriaHidden === null) select.removeAttribute("aria-hidden");
    else select.setAttribute("aria-hidden", previousAriaHidden);
    if (previousTabIndex === null) select.removeAttribute("tabindex");
    else select.setAttribute("tabindex", previousTabIndex);
  };
}

export function installDropdowns(): void {
  const style = document.createElement("style");
  style.textContent = `
    .bd-wrapper[hidden]{display:none}
    .bd-wrapper{display:inline-block;position:relative;vertical-align:middle;max-width:100%}
    .bd-wrapper .bd-enhanced{visibility:hidden!important}
    .bd-wrapper.bd-sized .bd-enhanced{width:100%!important}
    .bd-wrapper .bd-trigger{position:absolute;inset:0;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;margin:0;padding:0 20px 0 3px;overflow:hidden;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:#fff;border:1px solid #8da7c3;border-radius:2px;color:#111;cursor:pointer;line-height:normal;box-shadow:none}
    .bd-trigger:after{content:'▾';position:absolute;right:4px;top:50%;transform:translateY(-50%)}
    .bd-trigger:focus-visible,.bd-search:focus-visible{outline:2px solid #217d72;outline-offset:1px}
    .bd-wrapper .bd-trigger:disabled{background:#eee;color:#888;cursor:not-allowed}
    .bd-dropdown{position:fixed;z-index:2147483000;background:white;border:1px solid #b8cbd1;border-radius:5px;box-shadow:0 8px 24px #183c4a26;font:12px/1.35 system-ui;color:#192e3a;padding:4px;box-sizing:border-box}
    .bd-dropdown[hidden]{display:none}.bd-search{box-sizing:border-box;width:100%;padding:5px;border:1px solid #b8cbd1;border-radius:3px}.bd-options{max-height:200px;overflow:auto}.bd-option{display:flex;justify-content:space-between;gap:6px;padding:5px 6px;cursor:pointer}.bd-option:hover,.bd-highlighted{background:#e8f4f2}.bd-option[aria-disabled=true]{opacity:.5;cursor:not-allowed}.bd-option small{color:#526a72}
  `;
  document.head.append(style);
  const controls = new Map<HTMLSelectElement, () => void>();
  const scan = () => {
    for (const [element, dispose] of controls)
      if (!element.isConnected) {
        dispose();
        controls.delete(element);
      }
    document.querySelectorAll("select").forEach((select) => {
      if (!controls.has(select) && !select.multiple && !(select.size > 1))
        controls.set(select, enhance(select));
    });
  };
  scan();
  new MutationObserver((mutations) => {
    if (
      mutations.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches("select") || node.querySelector("select")),
        ),
      )
    )
      scan();
  }).observe(document.body, { childList: true, subtree: true });
}
