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
  window.name = `better-impexcube:${JSON.stringify({ action: "copy", job: "EXP-1" })}`;
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

test("finds only the requested grid page postback", async () => {
  const { nextPage } = await import("../src/job-search-data");
  const { document } = new Window();
  document.body.innerHTML = `<table id="ContentPlaceHolder1_gvJobNo"><tr><td><a href="javascript:__doPostBack('ctl00$ContentPlaceHolder1$gvJobNo','Page$2')">2</a><a href="javascript:__doPostBack('other','Page$3')">3</a></td></tr></table>`;
  expect(nextPage(document, 2)).toEqual({
    target: "ctl00$ContentPlaceHolder1$gvJobNo",
    argument: "Page$2",
  });
  expect(nextPage(document, 3)).toBeNull();
});

test("fuzzy ranks jobs and can restrict suggestions to close matches", async () => {
  const { rankJobs } = await import("../src/job-search-data");
  const jobs = [
    { job: "EXP-123", exporter: "Aluminium Works", sb: "SB-1" },
    { job: "EXP-987", exporter: "Banana Export", sb: "SB-2" },
  ];
  expect(rankJobs(jobs, "alumnium", true).map((j) => j.job)).toEqual([
    "EXP-123",
  ]);
  expect(rankJobs(jobs, "unknown consignee", false)).toHaveLength(2);
});

test("search follows the next page with that response view state", async () => {
  const { searchJobs } = await import("../src/job-search");
  const window = new Window({
    url: "https://export.impexcube.in/efrmJobDetails.aspx",
  });
  Object.assign(globalThis, {
    DOMParser: window.DOMParser,
    FormData: window.FormData,
  });
  const originalFetch = globalThis.fetch;
  const calls: URLSearchParams[] = [];
  const page = (job: string, viewstate: string, pager: string) =>
    `<form><input id="ContentPlaceHolder1_txtSearch"><input name="__VIEWSTATE" value="${viewstate}"></form><table id="ContentPlaceHolder1_gvJobNo"><tr><th></th><th>Job No</th><th>ExporterName</th><th>SB No</th></tr><tr><td><a href="javascript:__doPostBack('ctl00$ContentPlaceHolder1$gvJobNo','Select$0')">Select</a></td><td><span class="jobnomenu">${job}</span></td><td>Exporter</td><td>SB</td></tr>${pager}</table>`;
  const link = `<tr><td><a href="javascript:__doPostBack('ctl00$ContentPlaceHolder1$gvJobNo','Page$2')">2</a></td></tr>`;
  globalThis.fetch = (async (_url: unknown, options?: RequestInit) => {
    if (!options?.method)
      return new Response(
        '<form><input id="ContentPlaceHolder1_txtSearch"><input name="__VIEWSTATE" value="initial"></form>',
      );
    const data = options.body as URLSearchParams;
    calls.push(data);
    if (data.get("__EVENTARGUMENT") === "Page$2")
      return new Response(page("EXP-2", "last", ""));
    return new Response(page("EXP-1", "first", link));
  }) as typeof fetch;
  const result = await searchJobs("EXP", new AbortController().signal, 2);
  expect(result.jobs.map((j) => j.job)).toEqual(["EXP-1", "EXP-2"]);
  expect(
    calls.filter((c) => c.get("__EVENTARGUMENT") === "Page$2"),
  ).toHaveLength(4);
  expect(
    calls
      .find((c) => c.get("__EVENTARGUMENT") === "Page$2")
      ?.get("__VIEWSTATE"),
  ).toBe("first");
  globalThis.fetch = originalFetch;
  await window.happyDOM.abort();
});
