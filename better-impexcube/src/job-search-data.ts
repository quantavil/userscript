export type Job = { job: string; exporter: string; sb: string };

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
  return Array.from(table.rows).flatMap((row) => {
    const job = row.querySelector(".jobnomenu")?.textContent?.trim();
    if (!job || !row.querySelector('a[href*="Select$"]')) return [];
    return [
      {
        job,
        exporter: row.cells[exporter]?.textContent?.trim() ?? "",
        sb: row.cells[sb]?.textContent?.trim() ?? "",
      },
    ];
  });
}
