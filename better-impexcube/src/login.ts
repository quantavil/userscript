export function currentFinancialYear(date = new Date()): string {
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${start + 1}`;
}

const defaulted = new WeakSet<HTMLSelectElement>();

/** Fill the selection panel once per rendered panel; false when it is absent. */
function applyLoginDefaults(date: Date): boolean {
  const company = document.querySelector<HTMLSelectElement>("#drCompany");
  const branch = document.querySelector<HTMLSelectElement>("#drBranch");
  const year = document.querySelector<HTMLSelectElement>("#drFinancial");
  const go = document.querySelector<HTMLInputElement>("#btnGo");
  if (!company || !branch || !year || !go?.form) return false;
  if (defaulted.has(company)) return true;
  defaulted.add(company);
  const desiredYear = currentFinancialYear(date);
  const find = (select: HTMLSelectElement, label: string) => {
    const options = Array.from(select.options).filter(
      (option) =>
        !option.disabled &&
        option.value &&
        option.text.trim().toUpperCase() === label,
    );
    return options.length === 1 ? options[0] : undefined;
  };
  const desiredBranch = find(branch, "MORADABAD");
  const desiredYearOption = find(year, desiredYear);
  if (!desiredBranch || !desiredYearOption) return true;
  branch.value = desiredBranch.value;
  year.value = desiredYearOption.value;
  const companies = Array.from(company.options).filter(
    (option) =>
      !option.disabled &&
      option.value &&
      !/^--?\s*(choose|select)/i.test(option.text.trim()),
  );
  if (companies.length !== 1) return true;
  company.value = companies[0].value;
  go.click();
  return true;
}

/**
 * The selection panel is rendered by an UpdatePanel on the login page root
 * after credentials are accepted, so it may appear after DOMContentLoaded.
 */
export function installLoginDefaults(date = new Date()): void {
  if (location.hostname.toLowerCase() !== "export.impexcube.in") return;
  applyLoginDefaults(date);
  new MutationObserver(() => {
    applyLoginDefaults(date);
  }).observe(document.body, { childList: true, subtree: true });
}
