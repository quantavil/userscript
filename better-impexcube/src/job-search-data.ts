import Fuse from "fuse.js/basic";

export type Job = {
  job: string;
  exporter: string;
  sb: string;
  consignee?: string;
};

export function parseJobs(doc: Document): Job[] {
  if (!doc.querySelector("#ContentPlaceHolder1_txtSearch"))
    throw new Error("Search session unavailable");
  const table = doc.querySelector<HTMLTableElement>(
    "#ContentPlaceHolder1_gvJobNo",
  );
  if (!table) return [];
  const headers = Array.from(table.querySelectorAll("th"), (th) =>
    th.textContent?.trim().toLowerCase(),
  );
  const exporter = headers.indexOf("exportername");
  const sb = headers.indexOf("sb no");
  const consignee = headers.findIndex((header) =>
    /^(consignee|consignee ?name)$/.test(header ?? ""),
  );
  return Array.from(table.rows).flatMap((row) => {
    const job = row.querySelector(".jobnomenu")?.textContent?.trim();
    if (!job || !row.querySelector('a[href*="Select$"]')) return [];
    return [
      {
        job,
        exporter: row.cells[exporter]?.textContent?.trim() ?? "",
        sb: row.cells[sb]?.textContent?.trim() ?? "",
        ...(consignee >= 0
          ? { consignee: row.cells[consignee]?.textContent?.trim() ?? "" }
          : {}),
      },
    ];
  });
}

export function nextPage(
  doc: Document,
  page: number,
): { target: string; argument: string } | null {
  for (const link of doc.querySelectorAll<HTMLAnchorElement>(
    "#ContentPlaceHolder1_gvJobNo a",
  )) {
    const match = link
      .getAttribute("href")
      ?.match(/^javascript:__doPostBack\('([^']*\$gvJobNo)','(Page\$\d+)'\)$/);
    if (match?.[1] && match[2] === `Page$${page}`)
      return { target: match[1], argument: match[2] };
  }
  return null;
}

export function rankJobs(
  jobs: Job[],
  query: string,
  onlyMatches = false,
): Job[] {
  const matches = new Fuse(jobs, {
    keys: ["job", "sb", "exporter", "consignee"],
    threshold: 0.35,
    ignoreLocation: true,
  })
    .search(query)
    .map((result) => result.item);
  if (onlyMatches) return matches;
  const found = new Set(matches);
  return [...matches, ...jobs.filter((job) => !found.has(job))];
}
