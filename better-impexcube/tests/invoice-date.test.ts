import { expect, test } from "bun:test";
import { Window } from "happy-dom";

test("defaults a new supporting document to the matched invoice date without overwriting edits", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmEProductMainPage.aspx",
  });
  window.document.body.innerHTML = `<input id="ContentPlaceHolder1_txtJobNo" value="JOB-1"><select id="ContentPlaceHolder1_ddlInvNo"><option value="INV-1">INV-1</option></select><input id="ContentPlaceHolder1_tbProduct_TabSupportingdoc_txtDocIssueDt" value="09/11/2026"><input id="ContentPlaceHolder1_tbProduct_TabSupportingdoc_txtDocumentNo"><input id="ContentPlaceHolder1_tbProduct_TabSupportingdoc_txtIRNNo"><select id="ContentPlaceHolder1_tbProduct_TabSupportingdoc_ddldoctypecode"><option value=""></option></select>`;
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    Element: window.Element,
    HTMLInputElement: window.HTMLInputElement,
    MutationObserver: window.MutationObserver,
    DOMParser: window.DOMParser,
    Event: window.Event,
  });
  const html = `<input id="ContentPlaceHolder1_txtJobNo" value="JOB-1"><table id="ContentPlaceHolder1_tbInvoice_TabPanel1_gvInvoiceDetails"><tr><th></th><th></th><th>ID</th><th>S.No</th><th>Inv. No</th><th>Date</th></tr><tr><td></td><td></td><td>1</td><td>1</td><td>INV-1</td><td>30/10/2026</td></tr></table>`;
  const { installInvoiceDate } = await import("../src/invoice-date");
  installInvoiceDate(
    async () => html,
    () => "09/11/2026",
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  const issue = window.document.querySelector<HTMLInputElement>(
    "#ContentPlaceHolder1_tbProduct_TabSupportingdoc_txtDocIssueDt",
  )!;
  expect(issue.value).toBe("30/10/2026");
  issue.value = "01/11/2026";
  issue.dispatchEvent(new window.Event("input", { bubbles: true }));
  window.document.body.append(window.document.createElement("div"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(issue.value).toBe("01/11/2026");
  await window.happyDOM.abort();
});
