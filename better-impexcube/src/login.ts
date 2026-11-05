export function currentFinancialYear(date = new Date()): string {
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

export function installLoginDefaults(date = new Date()): void {
  if (location.hostname.toLowerCase() !== "export.impexcube.in") return;
  if (location.pathname.toLowerCase() !== "/frmloginnew.aspx") return;
  const company = document.querySelector<HTMLSelectElement>("#drCompany");
  const branch = document.querySelector<HTMLSelectElement>("#drBranch");
  const year = document.querySelector<HTMLSelectElement>("#drFinancial");
  const go = document.querySelector<HTMLInputElement>("#btnGo");
  if (!company || !branch || !year || !go?.form) return;
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
  if (!desiredBranch || !desiredYearOption) return;
  branch.value = desiredBranch.value;
  year.value = desiredYearOption.value;
  const companies = Array.from(company.options).filter(
    (option) =>
      !option.disabled &&
      option.value &&
      !/^--?\s*(choose|select)/i.test(option.text.trim()),
  );
  if (companies.length !== 1) return;
  company.value = companies[0].value;
  go.click();
}
