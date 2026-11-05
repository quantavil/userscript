const path = "/frmswitchBranch.aspx";
const prefix = "better-impexcube-context:";
const branchId = "#ContentPlaceHolder1_ddlbranch";
const yearId = "#ContentPlaceHolder1_drFinancial";

export async function installContextSwitch(): Promise<void> {
  if (location.hostname.toLowerCase() !== "export.impexcube.in") return;
  if (location.pathname.toLowerCase() === path.toLowerCase()) {
    if (!window.name.startsWith(prefix)) return;
    const saved = window.name.slice(prefix.length);
    window.name = "";
    try {
      const choice: unknown = JSON.parse(saved);
      if (
        !choice ||
        typeof choice !== "object" ||
        !("branch" in choice) ||
        !("year" in choice) ||
        typeof choice.branch !== "string" ||
        typeof choice.year !== "string"
      )
        return;
      const branch = document.querySelector<HTMLSelectElement>(branchId);
      const year = document.querySelector<HTMLSelectElement>(yearId);
      const go = document.querySelector<HTMLInputElement>(
        "#ContentPlaceHolder1_btnGo",
      );
      if (
        !branch ||
        !year ||
        !go ||
        !Array.from(branch.options).some(
          (o) => o.value === choice.branch && !o.disabled,
        ) ||
        !Array.from(year.options).some(
          (o) => o.value === choice.year && !o.disabled,
        )
      )
        return;
      branch.value = choice.branch;
      year.value = choice.year;
      go.click();
    } catch {
      /* Leave the native switch form available. */
    }
    return;
  }
  const branchLabel = document.querySelector<HTMLElement>("#lblBranchName");
  const yearLabel = document.querySelector<HTMLElement>("#lblFyear");
  if (!branchLabel || !yearLabel) return;
  try {
    const response = await fetch(path);
    if (!response.ok) return;
    const page = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    const branch = page.querySelector<HTMLSelectElement>(branchId);
    const year = page.querySelector<HTMLSelectElement>(yearId);
    if (!branch || !year) return;
    const branchText = branchLabel.textContent
      ?.replace(/^\s*branch\s*:\s*/i, "")
      .trim()
      .toUpperCase();
    const yearText = yearLabel.textContent
      ?.replace(/^\s*fin\.year\s*:\s*/i, "")
      .trim();
    const currentBranch = Array.from(branch.options).find(
      (o) => o.text.trim().toUpperCase() === branchText,
    );
    const currentYear = Array.from(year.options).find(
      (o) => o.text.trim() === yearText,
    );
    if (!currentBranch || !currentYear) return;
    const style = document.createElement("style");
    style.textContent = `.bic-context{color:white;font:8pt Verdana;white-space:nowrap}.bic-context select{font:inherit;color:white;background:#285bb2;border:0;max-width:112px;cursor:pointer}.bic-context option{color:#111;background:white}`;
    document.head.append(style);
    const controls = [branch, year].map((source, index) => {
      const select = document.createElement("select");
      select.className = "bic-context-select";
      select.setAttribute("aria-label", index ? "Financial year" : "Branch");
      for (const option of source.options)
        select.append(option.cloneNode(true));
      select.value = index ? currentYear.value : currentBranch.value;
      const label = document.createElement("label");
      label.className = "bic-context";
      label.append(index ? "Fin.Year : " : "Branch : ", select);
      return { label, select };
    });
    const change = () => {
      window.name =
        prefix +
        JSON.stringify({
          branch: controls[0].select.value,
          year: controls[1].select.value,
        });
      location.assign(path);
    };
    for (const control of controls)
      control.select.addEventListener("change", change);
    branchLabel.before(controls[0].label);
    yearLabel.before(controls[1].label);
    branchLabel.style.display = "none";
    yearLabel.style.display = "none";
  } catch {
    /* Keep the original labels when the form is unavailable. */
  }
}
