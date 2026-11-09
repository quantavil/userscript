export function installProductUi(): void {
  if (!/\/frmEProductMainPage\.aspx$/i.test(location.pathname)) return;

  const style = document.createElement("style");
  style.textContent = `
    .bic-product-table td{padding-top:4px;padding-bottom:4px}
  `;
  document.head.append(style);

  const titled = new WeakSet<Element>();
  const showValue = (event: Event) => {
    const field = event.target;
    if (
      !(
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      ) ||
      !field.id.includes("tbProduct_") ||
      (field instanceof HTMLInputElement && field.type !== "text") ||
      (field.hasAttribute("title") && !titled.has(field))
    )
      return;
    field.title = field.value;
    titled.add(field);
  };
  for (const type of ["focusin", "pointerover", "input", "change"])
    document.addEventListener(type, showValue);

  document.addEventListener("keydown", (event) => {
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.key !== "ArrowDown" && event.key !== "ArrowUp") ||
      !(event.target instanceof Element) ||
      event.target.tagName !== "A" ||
      event.target.textContent?.trim().toLowerCase() !== "select"
    )
      return;
    const table = event.target.closest<HTMLTableElement>(".bic-product-table");
    const row = event.target.closest("tr");
    if (!table || !row) return;
    const rows = [...table.rows];
    const direction = event.key === "ArrowDown" ? 1 : -1;
    for (
      let index = rows.indexOf(row) + direction;
      index >= 0 && index < rows.length;
      index += direction
    ) {
      const link = Array.from(
        rows[index]?.querySelectorAll<HTMLAnchorElement>("a") ?? [],
      ).find((item) => item.textContent?.trim().toLowerCase() === "select");
      if (link) {
        event.preventDefault();
        link.focus();
        break;
      }
    }
  });

  const scan = () => {
    document
      .querySelectorAll<HTMLTableElement>("table:not(.bic-product-table)")
      .forEach((table) => {
        const headings = [...table.querySelectorAll("th")]
          .filter((cell) => cell.closest("table") === table)
          .map((cell) => cell.textContent?.trim().toLowerCase());
        if (headings.includes("pro des") && headings.includes("ritc no"))
          table.classList.add("bic-product-table");
      });
  };
  scan();
  new MutationObserver((mutations) => {
    if (
      mutations.some((mutation) =>
        [...mutation.addedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches("table, th") || node.querySelector("table, th")),
        ),
      )
    )
      scan();
  }).observe(document.body, { childList: true, subtree: true });
}
