import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { parseJobs } from "../src/job-search-data";

test("extracts unique jobs from the grid and ignores pager rows", () => {
  const { document } = new Window();
  document.body.innerHTML = `<form><input id="ContentPlaceHolder1_txtSearch"></form><table id="ContentPlaceHolder1_gvJobNo"><tr><th></th><th>Job No</th><th>ExporterName</th><th>SB No</th></tr><tr><td><a href="javascript:__doPostBack('grid','Select$0')">Select</a></td><td><span class="jobnomenu">EXP-1</span></td><td>Exporter</td><td>SB123</td></tr><tr><td>1 2 3</td></tr></table>`;
  expect(parseJobs(document)).toEqual([
    { job: "EXP-1", exporter: "Exporter", sb: "SB123" },
  ]);
});

test("rejects pages that are not the job search form", () => {
  const { document } = new Window();
  expect(() => parseJobs(document)).toThrow("Search session unavailable");
});

test("searches the four fields, deduplicates results and preserves native search", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/efrmJobDetails.aspx",
  });
  window.document.body.innerHTML = `<form><span id="ContentPlaceHolder1_lblSearch">Search By</span><select id="ContentPlaceHolder1_ddlsearch"></select><input id="ContentPlaceHolder1_txtSearch"><input id="ContentPlaceHolder1_btnSearch" type="submit"></form>`;
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    DOMParser: window.DOMParser,
    FormData: window.FormData,
    Event: window.Event,
  });
  const originalFetch = globalThis.fetch;
  const fields: string[] = [];
  const searchForm = `<form><input id="ContentPlaceHolder1_txtSearch"><input name="__VIEWSTATE" value="state"></form>`;
  globalThis.fetch = (async (_url: unknown, options?: RequestInit) => {
    if (!options?.method) return new Response(searchForm);
    fields.push(
      (options.body as URLSearchParams).get(
        "ctl00$ContentPlaceHolder1$ddlsearch",
      )!,
    );
    return new Response(
      `${searchForm}<table id="ContentPlaceHolder1_gvJobNo"><tr><th></th><th>Job No</th><th>ExporterName</th><th>SB No</th></tr><tr><td><a href="javascript:__doPostBack('grid','Select$0')">Select</a></td><td><span class="jobnomenu">EXP-1</span></td><td>Exporter</td><td>SB123</td></tr></table>`,
    );
  }) as typeof fetch;
  const { installJobSearch } = await import("../src/job-search");
  installJobSearch();
  const input = window.document.querySelector<HTMLInputElement>(
    ".bic-job-search input",
  )!;
  input.value = "EXP";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 650));
  expect(fields).toEqual([
    "a.JobNo",
    "a.SBNo",
    "b.ExporterName",
    "b.Consignee",
  ]);
  expect(window.document.querySelectorAll(".bic-job-result")).toHaveLength(1);
  expect(
    window.document.querySelector(".bic-job-result")?.textContent,
  ).toContain("SB123");
  window.document.querySelector<HTMLButtonElement>(".bic-job-more")!.click();
  expect(
    window.document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtSearch",
    )!.hidden,
  ).toBe(false);
  globalThis.fetch = originalFetch;
  await window.happyDOM.abort();
});

test("copy handoff prefills the original form without submitting it", async () => {
  const window = new Window({
    url: "https://export.impexcube.in/frmCopyEJobDetails.aspx",
  });
  window.name =
    "better-impexcube:" + JSON.stringify({ action: "copy", job: "EXP-1" });
  window.document.body.innerHTML =
    '<form><input id="ContentPlaceHolder1_txtJobNo"><input type="submit"></form>';
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    Event: window.Event,
  });
  const { installJobSearch } = await import("../src/job-search");
  installJobSearch();
  expect(
    window.document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtJobNo",
    )!.value,
  ).toBe("EXP-1");
  expect(window.name).toBe("");
  await window.happyDOM.abort();
});
