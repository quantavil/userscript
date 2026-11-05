import { type Job, parseJobs } from "./job-search-data";

const searchPath = "/efrmJobDetails.aspx";
const copyPath = "/frmCopyEJobDetails.aspx";
const prefix = "better-impexcube:";
const fields = [
  ["a.JobNo", "Job number"],
  ["a.SBNo", "SB number"],
  ["b.ExporterName", "Exporter"],
  ["b.Consignee", "Consignee"],
] as const;

type Handoff = { action: "search" | "select" | "copy"; job: string };

function handoff(): boolean {
  if (!window.name.startsWith(prefix)) return false;
  let data: Handoff;
  try {
    data = JSON.parse(window.name.slice(prefix.length)) as Handoff;
  } catch {
    window.name = "";
    return false;
  }
  window.name = "";
  if (typeof data.job !== "string" || !data.job || data.job.length > 100)
    return false;
  if (
    data.action === "copy" &&
    location.pathname.toLowerCase() === copyPath.toLowerCase()
  ) {
    const input = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtJobNo",
    );
    if (input) {
      input.value = data.job;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
    return false;
  }
  if (location.pathname.toLowerCase() !== searchPath.toLowerCase())
    return false;
  if (data.action === "search") {
    const select = document.querySelector<HTMLSelectElement>(
      "#ContentPlaceHolder1_ddlsearch",
    );
    const input = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtSearch",
    );
    const button = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_btnSearch",
    );
    if (select && input && button && select.form) {
      select.value = "a.JobNo";
      input.value = data.job;
      window.name =
        prefix + JSON.stringify({ action: "select", job: data.job });
      select.form.requestSubmit(button);
      return true;
    }
  } else if (data.action === "select") {
    const row = Array.from(
      document.querySelectorAll<HTMLTableRowElement>(
        "#ContentPlaceHolder1_gvJobNo tr",
      ),
    ).find(
      (r) => r.querySelector(".jobnomenu")?.textContent?.trim() === data.job,
    );
    const link = row?.querySelector<HTMLAnchorElement>('a[href*="Select$"]');
    if (link) {
      link.click();
      return true;
    }
  }
  return false;
}

function openJob(job: string, action: "search" | "copy"): void {
  const tab = window.open("", "_blank");
  if (!tab) return;
  tab.name = prefix + JSON.stringify({ action, job });
  tab.location.href = action === "copy" ? copyPath : searchPath;
}

async function search(
  query: string,
  signal: AbortSignal,
): Promise<{ jobs: Job[]; partial: boolean }> {
  const response = await fetch(searchPath, { signal });
  if (!response.ok) throw new Error("Search unavailable");
  const doc = new DOMParser().parseFromString(
    await response.text(),
    "text/html",
  );
  const form = doc.querySelector<HTMLFormElement>("form");
  if (!form || !doc.querySelector("#ContentPlaceHolder1_txtSearch"))
    throw new Error("Search session unavailable");
  const jobs = new Map<string, Job>();
  let partial = false;
  for (const [field] of fields) {
    const data = new FormData(form);
    data.set("ctl00$ContentPlaceHolder1$ddlsearch", field);
    data.set("ctl00$ContentPlaceHolder1$txtSearch", query);
    data.set("ctl00$ContentPlaceHolder1$btnSearch", "Search");
    const result = await fetch(searchPath, {
      method: "POST",
      body: new URLSearchParams(data as never),
      signal,
    });
    if (!result.ok) throw new Error("Search unavailable");
    const page = new DOMParser().parseFromString(
      await result.text(),
      "text/html",
    );
    for (const job of parseJobs(page)) jobs.set(job.job, job);
    const table = page.querySelector<HTMLTableElement>(
      "#ContentPlaceHolder1_gvJobNo",
    );
    if (
      table &&
      Array.from(table.querySelectorAll("a")).some((a) =>
        /Page\$/.test(a.getAttribute("href") ?? ""),
      )
    )
      partial = true;
  }
  return { jobs: [...jobs.values()], partial };
}

export function installJobSearch(): void {
  if (handoff()) return;
  if (location.pathname.toLowerCase() !== searchPath.toLowerCase()) return;
  const native = document.querySelector<HTMLInputElement>(
    "#ContentPlaceHolder1_txtSearch",
  );
  const select = document.querySelector<HTMLSelectElement>(
    "#ContentPlaceHolder1_ddlsearch",
  );
  const button = document.querySelector<HTMLInputElement>(
    "#ContentPlaceHolder1_btnSearch",
  );
  const label = document.querySelector<HTMLElement>(
    "#ContentPlaceHolder1_lblSearch",
  );
  if (!native || !select || !button || !label || !native.parentElement) return;
  const style = document.createElement("style");
  style.textContent = `.bic-job-search{position:relative;display:inline-block;width:min(560px,75%);text-align:left;font:13px system-ui;vertical-align:middle}.bic-job-search input{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid #8da7c3;border-radius:4px;font:inherit}.bic-job-results{position:absolute;z-index:2147483000;left:0;right:0;top:100%;max-height:360px;overflow:auto;background:#fff;border:1px solid #b8cbd1;border-radius:4px;box-shadow:0 8px 24px #183c4a26;color:#192e3a}.bic-job-results[hidden]{display:none}.bic-job-result{display:flex;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #edf2f2}.bic-job-result div{flex:1;min-width:0;overflow-wrap:anywhere}.bic-job-result small{display:block;color:#526a72}.bic-job-result button,.bic-job-more{cursor:pointer;font:inherit}.bic-job-message{padding:10px;color:#526a72}.bic-job-more{margin:0 6px}`;
  document.head.append(style);
  const box = document.createElement("div");
  box.className = "bic-job-search";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Search job, SB, exporter or consignee";
  input.setAttribute("aria-label", input.placeholder);
  input.autocomplete = "off";
  const results = document.createElement("div");
  results.className = "bic-job-results";
  results.hidden = true;
  results.setAttribute("aria-live", "polite");
  box.append(input, results);
  const more = document.createElement("button");
  more.type = "button";
  more.className = "bic-job-more";
  more.textContent = "Other search options";
  label.before(box, more);
  const original = [
    label,
    select.closest<HTMLElement>(".bd-wrapper") ?? select,
    native,
    button,
  ];
  original.forEach((element) => {
    element.hidden = true;
  });
  more.addEventListener("click", () => {
    const show = original[0]?.hidden;
    original.forEach((element) => {
      element.hidden = !show;
    });
    more.textContent = show ? "Hide other options" : "Other search options";
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let generation = 0;
  const message = (text: string) => {
    results.replaceChildren();
    const p = document.createElement("div");
    p.className = "bic-job-message";
    p.textContent = text;
    results.append(p);
    results.hidden = false;
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    controller?.abort();
    const current = ++generation;
    const query = input.value.trim();
    if (query.length < 2) {
      results.hidden = true;
      return;
    }
    message("Searching…");
    timer = setTimeout(() => {
      controller = new AbortController();
      void search(query, controller.signal)
        .then(({ jobs, partial }) => {
          if (current !== generation) return;
          results.replaceChildren();
          if (!jobs.length) {
            message("No matching jobs found.");
            return;
          }
          for (const job of jobs) {
            const row = document.createElement("div");
            row.className = "bic-job-result";
            const info = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = job.job;
            const details = document.createElement("small");
            details.textContent = [job.exporter, job.sb && `SB ${job.sb}`]
              .filter(Boolean)
              .join(" · ");
            info.append(title, details);
            const open = document.createElement("button");
            open.type = "button";
            open.textContent = "Open";
            open.addEventListener("click", () => openJob(job.job, "search"));
            const copy = document.createElement("button");
            copy.type = "button";
            copy.textContent = "Copy job";
            copy.addEventListener("click", () => openJob(job.job, "copy"));
            row.append(info, open, copy);
            results.append(row);
          }
          if (partial) {
            const note = document.createElement("div");
            note.className = "bic-job-message";
            note.textContent =
              "Showing the first page for each search field. Refine your search for more results.";
            results.append(note);
          }
          results.hidden = false;
        })
        .catch((error: unknown) => {
          if (
            current === generation &&
            !(error instanceof DOMException && error.name === "AbortError")
          )
            message("Search failed. Check your session and try again.");
        });
    }, 500);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") results.hidden = true;
    if (event.key === "Enter") event.preventDefault();
  });
  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2 && results.childNodes.length)
      results.hidden = false;
  });
  document.addEventListener("pointerdown", (event) => {
    if (!box.contains(event.target as Node)) results.hidden = true;
  });
}
