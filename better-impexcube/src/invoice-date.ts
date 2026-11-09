const prefix = "ContentPlaceHolder1_tbProduct_TabSupportingdoc_";
const todayDate = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

export function installInvoiceDate(
  load = async () => {
    const response = await fetch("/efrmInvoiceDetails.aspx?JobMode=Shipment", {
      credentials: "same-origin",
    });
    if (
      !response.ok ||
      !new URL(response.url).pathname
        .toLowerCase()
        .endsWith("/efrminvoicedetails.aspx")
    )
      throw new Error("Invoice page unavailable");
    return response.text();
  },
  today = todayDate,
): void {
  if (!/\/frmEProductMainPage\.aspx$/i.test(location.pathname)) return;
  const attempted = new WeakSet<HTMLInputElement>();
  const input = (id: string) =>
    document.getElementById(id) as HTMLInputElement | null;
  const scan = () => {
    const issue = input(`${prefix}txtDocIssueDt`);
    const job = input("ContentPlaceHolder1_txtJobNo")?.value.trim();
    const invoice = (
      document.getElementById(
        "ContentPlaceHolder1_ddlInvNo",
      ) as HTMLSelectElement | null
    )?.value.trim();
    const docNo = input(`${prefix}txtDocumentNo`);
    const irn = input(`${prefix}txtIRNNo`);
    const type = document.getElementById(
      `${prefix}ddldoctypecode`,
    ) as HTMLSelectElement | null;
    if (
      !issue ||
      attempted.has(issue) ||
      !job ||
      !invoice ||
      !docNo ||
      !irn ||
      !type ||
      issue.disabled ||
      issue.readOnly ||
      issue.value !== today() ||
      docNo.value ||
      irn.value ||
      type.value
    )
      return;
    attempted.add(issue);
    let touched = false;
    issue.addEventListener(
      "input",
      () => {
        touched = true;
      },
      { once: true },
    );
    void load()
      .then((html) => {
        const page = new DOMParser().parseFromString(html, "text/html");
        if (
          (
            page.getElementById(
              "ContentPlaceHolder1_txtJobNo",
            ) as HTMLInputElement | null
          )?.value.trim() !== job
        )
          return;
        const rows = [
          ...page.querySelectorAll<HTMLTableRowElement>(
            "#ContentPlaceHolder1_tbInvoice_TabPanel1_gvInvoiceDetails tr",
          ),
        ];
        const headings = [...(rows.shift()?.querySelectorAll("th") ?? [])].map(
          (cell) => cell.textContent?.trim(),
        );
        if (
          headings[3] !== "S.No" ||
          headings[4] !== "Inv. No" ||
          headings[5] !== "Date"
        )
          return;
        const matches = rows.filter(
          (row) => row.cells[4]?.textContent?.trim() === invoice,
        );
        const date =
          matches.length === 1
            ? matches[0]?.cells[5]?.textContent?.trim()
            : undefined;
        if (
          !date ||
          !/^\d{2}\/\d{2}\/\d{4}$/.test(date) ||
          touched ||
          !issue.isConnected ||
          issue.disabled ||
          issue.readOnly ||
          issue.value !== today() ||
          docNo.value ||
          irn.value ||
          type.value ||
          input("ContentPlaceHolder1_txtJobNo")?.value.trim() !== job ||
          (
            document.getElementById(
              "ContentPlaceHolder1_ddlInvNo",
            ) as HTMLSelectElement | null
          )?.value.trim() !== invoice
        )
          return;
        issue.value = date;
        issue.dispatchEvent(new Event("input", { bubbles: true }));
        issue.dispatchEvent(new Event("change", { bubbles: true }));
      })
      .catch(() => {});
  };
  scan();
  new MutationObserver(scan).observe(document.body, {
    childList: true,
    subtree: true,
  });
}
