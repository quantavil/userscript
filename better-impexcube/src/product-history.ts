import { watchDom } from "./dom";

const INVOICE_ID = "ContentPlaceHolder1_ddlInvNo";
const PRODUCT_ID = "ContentPlaceHolder1_ddlProductSLNo";
const JOB_ID = "ContentPlaceHolder1_txtJobNo";
const GO_ID = "ContentPlaceHolder1_btnGetJob";
const STATUS_ID = "ContentPlaceHolder1_LblJobSelect";
const SUBMIT_ID = "ContentPlaceHolder1_btnSubmitAll";

const KEY_VALUES = new Set([
  "Invoice Amount",
  "Product Value",
  "FOB Value",
  "PMV Value",
  "Drawback Amt",
  "ROSL Amt",
]);

const ROW_CLASSES = [
  "bic-h-head",
  "bic-h-status",
  "bic-h-control",
  "bic-h-job",
  "bic-h-invoice",
  "bic-h-product",
  "bic-h-nav",
  "bic-h-stat",
  "bic-h-key",
  "bic-h-action",
];

type ChipGroup = {
  group: HTMLDivElement;
  chips: HTMLDivElement;
};

type Panel = {
  table: HTMLTableElement;
  job: HTMLInputElement;
  invoice: HTMLSelectElement;
  product: HTMLSelectElement;
  go: HTMLInputElement | null;
  statusRow: HTMLTableRowElement | null;
  nav: HTMLTableRowElement;
  invoiceGroup: ChipGroup;
  productGroup: ChipGroup;
  invoiceSignature: string;
  productSignature: string;
  lastJob: string;
  autoSelected: boolean;
  userChanged: boolean;
  internal: boolean;
  disposed: boolean;
  dispose: () => void;
};

const installed = new WeakSet<Document>();

function isProductPage(): boolean {
  return /\/frmEProductMainPage\.aspx$/i.test(location.pathname);
}

function dispatchChange(select: HTMLSelectElement): void {
  const EventConstructor = select.ownerDocument.defaultView?.Event ?? Event;
  select.dispatchEvent(new EventConstructor("change", { bubbles: true }));
}

function isDisabled(option: HTMLOptionElement): boolean {
  return (
    option.disabled ||
    (option.parentElement?.tagName === "OPTGROUP" &&
      (option.parentElement as HTMLOptGroupElement).disabled)
  );
}

function focusSelect(select: HTMLSelectElement): void {
  const trigger = select
    .closest(".bd-wrapper")
    ?.querySelector<HTMLButtonElement>(".bd-trigger");
  (trigger ?? select).focus();
}

function signature(select: HTMLSelectElement): string {
  return [
    select.disabled ? "1" : "0",
    ...[...select.options].map(
      (option) =>
        `${option.value}\u0000${option.textContent?.trim() ?? ""}\u0000${option.selected ? "1" : "0"}\u0000${isDisabled(option) ? "1" : "0"}`,
    ),
  ].join("\u0001");
}

function createChipGroup(doc: Document, key: string, label: string): ChipGroup {
  const group = doc.createElement("div");
  group.className = "bic-h-quick-group";
  group.dataset.group = key;
  const caption = doc.createElement("span");
  caption.className = "bic-h-quick-label";
  caption.textContent = label;
  const chips = doc.createElement("div");
  chips.className = "bic-h-chips";
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", label);
  group.append(caption, chips);
  group.hidden = true;
  return { group, chips };
}

function buildChips(
  panel: Panel,
  select: HTMLSelectElement,
  target: ChipGroup,
  kind: "invoice" | "product",
): void {
  const current = signature(select);
  if (
    kind === "invoice"
      ? panel.invoiceSignature === current
      : panel.productSignature === current
  )
    return;
  if (kind === "invoice") panel.invoiceSignature = current;
  else panel.productSignature = current;

  target.chips.replaceChildren();
  const options = [...select.options].filter(
    (option) => option.value.trim() && !isDisabled(option),
  );
  if (select.disabled || options.length < 2) {
    target.group.hidden = true;
    return;
  }

  const label = kind === "invoice" ? "Invoice" : "Product";
  const fragment = panel.table.ownerDocument.createDocumentFragment();
  for (const option of options) {
    const text = option.textContent?.trim() || option.value;
    const chip = panel.table.ownerDocument.createElement("button");
    chip.type = "button";
    chip.className = "bic-h-chip";
    chip.textContent = text;
    chip.title = `${label} ${text}`;
    chip.setAttribute("aria-label", `${label} ${text}`);
    chip.setAttribute("aria-pressed", String(option.selected));
    if (option.selected) chip.classList.add("is-active");
    chip.addEventListener("click", () => {
      if (select.disabled) return;
      if (option.selected) {
        focusSelect(select);
        return;
      }
      option.selected = true;
      panel.internal = true;
      try {
        dispatchChange(select);
      } finally {
        panel.internal = false;
      }
    });
    fragment.append(chip);
  }
  target.chips.append(fragment);
  target.group.hidden = false;
}

function maybeAutoSelect(panel: Panel): void {
  if (panel.autoSelected || panel.userChanged || panel.invoice.disabled) return;
  const first = [...panel.invoice.options].find(
    (option) => option.value.trim() && !isDisabled(option),
  );
  if (!first) return;
  panel.autoSelected = true;
  if (panel.invoice.value.trim()) return;

  first.selected = true;
  panel.internal = true;
  try {
    dispatchChange(panel.invoice);
  } finally {
    panel.internal = false;
  }
}

function refresh(panel: Panel): void {
  if (panel.disposed || !panel.table.isConnected) return;

  const job = panel.job.value.trim();
  if (job !== panel.lastJob) {
    panel.lastJob = job;
    panel.autoSelected = false;
    panel.userChanged = false;
  }

  if (panel.statusRow) {
    const text = panel.statusRow.textContent?.trim() ?? "";
    panel.statusRow.hidden = !text;
  }

  buildChips(panel, panel.invoice, panel.invoiceGroup, "invoice");
  buildChips(panel, panel.product, panel.productGroup, "product");
  panel.nav.hidden =
    panel.invoiceGroup.group.hidden && panel.productGroup.group.hidden;
  maybeAutoSelect(panel);
}

function setupPanel(doc: Document, table: HTMLTableElement): Panel | undefined {
  const invoice = doc.getElementById(INVOICE_ID);
  const product = doc.getElementById(PRODUCT_ID);
  const job = doc.getElementById(JOB_ID);
  if (
    !invoice ||
    !product ||
    !job ||
    invoice.tagName !== "SELECT" ||
    product.tagName !== "SELECT" ||
    job.tagName !== "INPUT"
  )
    return;

  table.classList.add("bic-history-table");
  const rows = [...table.rows];
  for (const row of rows) row.classList.remove(...ROW_CLASSES);
  table.querySelector(".bic-h-nav")?.remove();

  let statusRow: HTMLTableRowElement | null = null;
  let anchorRow: HTMLTableRowElement | null = null;

  for (const [index, row] of rows.entries()) {
    const label = row.cells[0]?.textContent?.trim() ?? "";
    if (
      row.querySelector("strong")?.textContent?.trim().toLowerCase() ===
      "history"
    ) {
      row.classList.add("bic-h-head");
    } else if (
      row.querySelector(`#${STATUS_ID}`) ||
      (index === 1 && row.cells.length === 1)
    ) {
      row.classList.add("bic-h-status");
      statusRow = row;
    } else if (label === "JobNo") {
      row.classList.add("bic-h-control", "bic-h-job");
    } else if (label === "Invoice No") {
      row.classList.add("bic-h-control", "bic-h-invoice");
      anchorRow ??= row;
    } else if (label === "Prd.SNo") {
      row.classList.add("bic-h-control", "bic-h-product");
      anchorRow = row;
    } else if (row.querySelector(`#${SUBMIT_ID}`)) {
      row.classList.add("bic-h-action");
    } else if (
      label &&
      row.cells.length >= 2 &&
      row.cells[1]?.querySelector('span[id^="ContentPlaceHolder1_"]')
    ) {
      row.classList.add("bic-h-stat");
      if (KEY_VALUES.has(label)) row.classList.add("bic-h-key");
    }
  }

  const nav = doc.createElement("tr");
  nav.className = "bic-h-nav";
  const cell = doc.createElement("td");
  cell.colSpan = 2;
  const quick = doc.createElement("div");
  quick.className = "bic-h-quick";
  const invoiceGroup = createChipGroup(doc, "invoice", "Invoices");
  const productGroup = createChipGroup(doc, "product", "Products");
  quick.append(invoiceGroup.group, productGroup.group);
  cell.append(quick);
  nav.append(cell);

  if (anchorRow) anchorRow.insertAdjacentElement("afterend", nav);
  else if (table.tBodies[0]) table.tBodies[0].append(nav);
  else table.append(nav);

  const goElement = doc.getElementById(GO_ID);
  const go =
    goElement?.tagName === "INPUT" ? (goElement as HTMLInputElement) : null;

  let observer: MutationObserver | undefined;
  const panel: Panel = {
    table,
    job: job as HTMLInputElement,
    invoice: invoice as HTMLSelectElement,
    product: product as HTMLSelectElement,
    go,
    statusRow,
    nav,
    invoiceGroup,
    productGroup,
    invoiceSignature: "",
    productSignature: "",
    lastJob: (job as HTMLInputElement).value.trim(),
    autoSelected: false,
    userChanged: false,
    internal: false,
    disposed: false,
    dispose: () => {
      panel.disposed = true;
      observer?.disconnect();
      panel.invoice.removeEventListener("change", onInvoiceChange);
      panel.product.removeEventListener("change", onProductChange);
      panel.go?.removeEventListener("click", onGo);
      panel.nav.remove();
      panel.table.classList.remove("bic-history-table");
      for (const row of panel.table.rows) row.classList.remove(...ROW_CLASSES);
      if (panel.statusRow) panel.statusRow.hidden = false;
    },
  };

  function onInvoiceChange() {
    if (!panel.internal) panel.userChanged = true;
    refresh(panel);
  }
  function onProductChange() {
    refresh(panel);
  }
  function onGo() {
    panel.autoSelected = false;
    panel.userChanged = false;
  }

  panel.invoice.addEventListener("change", onInvoiceChange);
  panel.product.addEventListener("change", onProductChange);
  panel.go?.addEventListener("click", onGo);

  const Observer = doc.defaultView?.MutationObserver ?? MutationObserver;
  observer = new Observer(() => refresh(panel));
  for (const select of [panel.invoice, panel.product])
    observer.observe(select, {
      attributes: true,
      attributeFilter: ["disabled"],
      childList: true,
      subtree: true,
    });
  if (panel.statusRow)
    observer.observe(panel.statusRow, {
      characterData: true,
      childList: true,
      subtree: true,
    });

  refresh(panel);
  return panel;
}

export function installProductHistory(): void {
  if (!isProductPage()) return;
  const doc = document;
  if (installed.has(doc)) return;
  installed.add(doc);

  let panel: Panel | undefined;
  const scan = () => {
    const invoice = doc.getElementById(INVOICE_ID);
    if (invoice?.tagName !== "SELECT") {
      panel?.dispose();
      panel = undefined;
      return;
    }
    const table = invoice.closest("table");
    if (table?.tagName !== "TABLE") {
      panel?.dispose();
      panel = undefined;
      return;
    }
    if (
      panel?.table === table &&
      panel.invoice === invoice &&
      panel.product.isConnected &&
      panel.job.isConnected
    ) {
      refresh(panel);
      return;
    }
    panel?.dispose();
    panel = setupPanel(doc, table as HTMLTableElement);
  };

  watchDom("table, select", scan);
  scan();
}
