import { expect, test } from "bun:test";
import { Window } from "happy-dom";

type Setup = {
  window: Window;
  invoice: HTMLSelectElement;
  product: HTMLSelectElement;
  job: HTMLInputElement;
  status: HTMLElement;
  statusRow: HTMLTableRowElement;
};

function option(value: string, text = value, selected = false): string {
  return `<option value="${value}"${selected ? " selected" : ""}>${text}</option>`;
}

function setup({
  invoices = ["INV-1", "INV-2"],
  products = ["1", "2", "3"],
  selectedInvoice,
  selectedProduct,
  path = "frmEProductMainPage.aspx",
  status = "Please select Invoice No",
}: {
  invoices?: string[];
  products?: string[];
  selectedInvoice?: string;
  selectedProduct?: string;
  path?: string;
  status?: string;
} = {}): Setup {
  const window = new Window({
    url: `https://export.impexcube.in/${path}`,
  });
  const invoiceOptions = [
    option("", "--Choose--", !selectedInvoice),
    ...invoices.map((value) => option(value, value, value === selectedInvoice)),
  ].join("");
  const productOptions = [
    option("", "--Choose--", !selectedProduct),
    ...products.map((value) =>
      option(
        value,
        value,
        selectedProduct === value ||
          (!selectedProduct && products.indexOf(value) === 0),
      ),
    ),
  ].join("");
  window.document.body.innerHTML = `
    <table>
      <tbody>
        <tr><td colspan="2"><strong>History</strong></td></tr>
        <tr><td colspan="2"><span id="ContentPlaceHolder1_LblJobSelect">${status}</span></td></tr>
        <tr><td>JobNo</td><td><input id="ContentPlaceHolder1_txtJobNo" value="JOB-1"><input type="button" id="ContentPlaceHolder1_btnGetJob" value="Go"></td></tr>
        <tr><td>Invoice No</td><td><select id="ContentPlaceHolder1_ddlInvNo">${invoiceOptions}</select></td></tr>
        <tr><td>Prd.SNo</td><td><select id="ContentPlaceHolder1_ddlProductSLNo">${productOptions}</select></td></tr>
        <tr><td>InvSlNo</td><td><span id="ContentPlaceHolder1_lblAgen" class="arealaber1a">1</span></td></tr>
        <tr><td>Invoice Amount</td><td><span id="ContentPlaceHolder1_lblInvAmt" class="arealaber1a">100.00</span><span id="ContentPlaceHolder1_lblInvAmtCurrency" class="arealaber1a">FC</span></td></tr>
        <tr><td>Product Value</td><td><span id="ContentPlaceHolder1_lblProduct" class="arealaber1a">90.00</span><span id="ContentPlaceHolder1_lblProductCurrency" class="arealaber1a">FC</span></td></tr>
        <tr><td>FOB Value</td><td><span id="ContentPlaceHolder1_lblfobvalue" class="arealaber1a">9000.00</span></td></tr>
        <tr><td>PMV Value</td><td><span id="ContentPlaceHolder1_lblPMVValue" class="arealaber1a"></span></td></tr>
        <tr><td>Other Deduction</td><td><span id="ContentPlaceHolder1_lblOtherDeductionRate" class="arealaber1a"></span></td></tr>
        <tr><td colspan="2"><input type="button" id="ContentPlaceHolder1_btnSubmitAll" value="Submit All"></td></tr>
      </tbody>
    </table>`;
  const invoiceSelect = window.document.querySelector<HTMLSelectElement>(
    "#ContentPlaceHolder1_ddlInvNo",
  )!;
  if (selectedInvoice) invoiceSelect.value = selectedInvoice;
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    Element: window.Element,
    Event: window.Event,
    MutationObserver: window.MutationObserver,
  });
  return {
    window,
    invoice: window.document.querySelector<HTMLSelectElement>(
      "#ContentPlaceHolder1_ddlInvNo",
    )!,
    product: window.document.querySelector<HTMLSelectElement>(
      "#ContentPlaceHolder1_ddlProductSLNo",
    )!,
    job: window.document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtJobNo",
    )!,
    status: window.document.querySelector<HTMLElement>(
      "#ContentPlaceHolder1_LblJobSelect",
    )!,
    statusRow: window.document
      .querySelector<HTMLTableRowElement>("#ContentPlaceHolder1_LblJobSelect")!
      .closest("tr")!,
  };
}

async function install(): Promise<void> {
  const { installProductHistory } = await import("../src/product-history");
  installProductHistory();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("selects the first invoice once without overriding a later choice", async () => {
  const { window, invoice } = setup();
  let changes = 0;
  invoice.addEventListener("change", () => changes++);

  await install();

  expect(invoice.value).toBe("INV-1");
  expect(changes).toBe(1);
  expect(window.document.querySelector(".bic-history-table")).not.toBeNull();
  expect(
    window.document
      .querySelector(".bic-h-stat.bic-h-key")
      ?.querySelector("td")
      ?.textContent?.trim(),
  ).toBe("Invoice Amount");

  window.document.body.append(window.document.createElement("select"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(invoice.value).toBe("INV-1");
  expect(changes).toBe(1);

  await window.happyDOM.abort();
});

test("leaves an invoice that the server already selected alone", async () => {
  const { window, invoice } = setup({ selectedInvoice: "INV-2" });
  let changes = 0;
  invoice.addEventListener("change", () => changes++);

  await install();

  expect(invoice.value).toBe("INV-2");
  expect(changes).toBe(0);
  await window.happyDOM.abort();
});

test("does not reselect an invoice after the user clears it", async () => {
  const { window, invoice } = setup();
  await install();
  expect(invoice.value).toBe("INV-1");

  invoice.value = "";
  invoice.dispatchEvent(new window.Event("change", { bubbles: true }));
  expect(invoice.value).toBe("");

  window.document.body.append(window.document.createElement("select"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(invoice.value).toBe("");
  await window.happyDOM.abort();
});

test("offers one-click invoice and product chips", async () => {
  const { window, invoice, product } = setup();
  await install();

  const invoiceChips = () => [
    ...window.document.querySelectorAll<HTMLButtonElement>(
      '[data-group="invoice"] .bic-h-chip',
    ),
  ];
  const productChips = () => [
    ...window.document.querySelectorAll<HTMLButtonElement>(
      '[data-group="product"] .bic-h-chip',
    ),
  ];

  expect(invoiceChips().map((chip) => chip.textContent)).toEqual([
    "INV-1",
    "INV-2",
  ]);
  expect(productChips().map((chip) => chip.textContent)).toEqual([
    "1",
    "2",
    "3",
  ]);
  expect(invoiceChips()[0]?.classList.contains("is-active")).toBe(true);
  expect(productChips()[0]?.classList.contains("is-active")).toBe(true);

  invoiceChips()[1]?.click();
  expect(invoice.value).toBe("INV-2");
  expect(invoiceChips()[1]?.classList.contains("is-active")).toBe(true);

  productChips()[2]?.click();
  expect(product.value).toBe("3");
  expect(productChips()[2]?.classList.contains("is-active")).toBe(true);
  await window.happyDOM.abort();
});

test("skips disabled invoices and hides the remaining single-option group", async () => {
  const { window, invoice } = setup();
  invoice.options[1]!.disabled = true;
  await install();

  expect(invoice.value).toBe("INV-2");
  expect(
    window.document.querySelector<HTMLElement>('[data-group="invoice"]')
      ?.hidden,
  ).toBe(true);
  expect(
    window.document.querySelectorAll('[data-group="invoice"] .bic-h-chip')
      .length,
  ).toBe(0);
  await window.happyDOM.abort();
});

test("hides both chip groups and the nav row when each has one real option", async () => {
  const { window, invoice, product } = setup({
    invoices: ["INV-1"],
    products: ["1"],
  });
  await install();

  expect(invoice.value).toBe("INV-1");
  expect(product.value).toBe("1");
  expect(
    window.document.querySelector<HTMLElement>('[data-group="invoice"]')
      ?.hidden,
  ).toBe(true);
  expect(
    window.document.querySelector<HTMLElement>('[data-group="product"]')
      ?.hidden,
  ).toBe(true);
  expect(
    window.document.querySelector<HTMLTableRowElement>(".bic-h-nav")?.hidden,
  ).toBe(true);
  await window.happyDOM.abort();
});

test("does not auto-select when the invoice select is disabled", async () => {
  const { window, invoice } = setup();
  invoice.disabled = true;
  await install();

  expect(invoice.value).toBe("");
  expect(
    window.document.querySelector<HTMLElement>('[data-group="invoice"]')
      ?.hidden,
  ).toBe(true);
  await window.happyDOM.abort();
});

test("auto-selects invoices and rebuilds chips when options arrive later", async () => {
  const { window, invoice } = setup({ invoices: [], products: [] });
  await install();
  expect(invoice.value).toBe("");

  for (const value of ["INV-7", "INV-8"]) {
    const item = window.document.createElement("option");
    item.value = value;
    item.textContent = value;
    invoice.append(item);
  }
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(invoice.value).toBe("INV-7");
  expect(
    window.document.querySelectorAll('[data-group="invoice"] .bic-h-chip')
      .length,
  ).toBe(2);
  await window.happyDOM.abort();
});

test("hides the status row when it has no message", async () => {
  const { window, status, statusRow } = setup();
  await install();
  expect(statusRow.hidden).toBe(false);

  status.textContent = "";
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(statusRow.hidden).toBe(true);

  status.textContent = "Choose an invoice";
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(statusRow.hidden).toBe(false);
  await window.happyDOM.abort();
});

test("does nothing outside the product page", async () => {
  const { window, invoice } = setup({ path: "HomePage.aspx" });
  let changes = 0;
  invoice.addEventListener("change", () => changes++);

  await install();

  expect(invoice.value).toBe("");
  expect(changes).toBe(0);
  expect(window.document.querySelector(".bic-history-table")).toBeNull();
  await window.happyDOM.abort();
});
