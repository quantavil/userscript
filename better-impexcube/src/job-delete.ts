const deletePath = "/frmDeleteJobNo.aspx";
const prefix = "better-impexcube-delete:";
const jobPattern = /^[A-Za-z0-9/_-]{1,100}$/;

function openDelete(job: string): void {
  const tab = window.open("", "_blank");
  if (!tab) return;
  tab.name = `${prefix}open:${job}`;
  tab.location.href = deletePath;
}

function confirmDelete(
  job: string,
  input: HTMLInputElement,
  native: HTMLInputElement,
): void {
  const dialog = document.createElement("dialog");
  dialog.className = "bic-delete-dialog";
  dialog.innerHTML = `<h2>Delete job?</h2><p>This will delete <strong></strong>. Check the job details on this page before continuing.</p><label>Type the job number to confirm<input class="bic-delete-confirm-input" autocomplete="off" spellcheck="false"></label><div class="bic-delete-actions"><button type="button" class="bic-delete-cancel">Cancel</button><button type="button" class="bic-delete-confirm" disabled>Delete job</button></div>`;
  const title = dialog.querySelector("strong");
  const typed = dialog.querySelector<HTMLInputElement>("input");
  const confirm = dialog.querySelector<HTMLButtonElement>(
    ".bic-delete-confirm",
  );
  if (!title || !typed || !confirm) return;
  title.textContent = job;
  const valid = () => typed.value.trim() === job && input.value.trim() === job;
  const update = () => {
    confirm.disabled = !valid();
  };
  typed.addEventListener("input", update);
  input.addEventListener("input", update);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog
    .querySelector(".bic-delete-cancel")
    ?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => dialog.remove());
  confirm.addEventListener("click", () => {
    if (!valid()) return;
    confirm.disabled = true;
    native.click();
    update();
  });
  if (!document.querySelector("style.bic-delete-style")) {
    const style = document.createElement("style");
    style.className = "bic-delete-style";
    style.textContent = `.bic-delete-dialog{width:min(400px,calc(100% - 48px));border:1px solid #c8d1db;border-radius:8px;padding:20px;color:#1f2937;font:14px system-ui;box-shadow:0 12px 40px #0004}.bic-delete-dialog::backdrop{background:#0008}.bic-delete-dialog h2{font-size:18px;margin:0 0 12px}.bic-delete-dialog p{line-height:1.5}.bic-delete-dialog label{display:block;font-weight:600}.bic-delete-dialog input{box-sizing:border-box;display:block;width:100%;margin:7px 0 16px;padding:8px;border:1px solid #9baabb;border-radius:4px;font:inherit}.bic-delete-actions{display:flex;justify-content:flex-end;gap:8px}.bic-delete-actions button{padding:7px 12px;border:1px solid #aab5c0;border-radius:4px;cursor:pointer}.bic-delete-confirm{background:#b42318;color:white;border-color:#b42318!important}.bic-delete-confirm:disabled{opacity:.45;cursor:not-allowed}`;
    document.head.append(style);
  }
  document.body.append(dialog);
  dialog.showModal();
  typed.focus();
}

export function installJobDelete(
  open: (job: string) => void = openDelete,
): void {
  if (
    location.pathname.toLowerCase() === deletePath.toLowerCase() &&
    window.name.startsWith(prefix)
  ) {
    const isSameOrigin =
      !document.referrer ||
      document.referrer.startsWith(location.origin) ||
      (() => {
        try {
          return Boolean(
            window.opener && window.opener.location.origin === location.origin,
          );
        } catch {
          return false;
        }
      })();
    if (!isSameOrigin) return;
    const handoff = window.name.slice(prefix.length);
    window.name = "";
    const separator = handoff.indexOf(":");
    const phase = handoff.slice(0, separator);
    const job = handoff.slice(separator + 1);
    if (separator < 0 || !jobPattern.test(job)) return;
    const input = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_txtJobno",
    );
    const go = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_btngo",
    );
    const native = document.querySelector<HTMLInputElement>(
      "#ContentPlaceHolder1_btnChangeFyear",
    );
    if (phase === "open" && input && go && input.form) {
      input.value = job;
      window.name = `${prefix}loaded:${job}`;
      input.form.requestSubmit(go);
    } else if (phase === "loaded" && input?.value === job && native) {
      confirmDelete(job, input, native);
    }
    return;
  }
  if (location.pathname.toLowerCase() !== "/efrmjobdetails.aspx") return;
  const menu = document.querySelector("#myMenu");
  const grid = document.querySelector("#ContentPlaceHolder1_gvJobNo");
  if (!menu || !grid || menu.querySelector(".bic-delete-menu")) return;
  let job = "";
  const selectRow = (event: Event) => {
    const row = (event.target as Element).closest("tr");
    job = row?.querySelector(".jobnomenu")?.textContent?.trim() ?? "";
  };
  grid.addEventListener("mousedown", selectRow, true);
  grid.addEventListener("contextmenu", selectRow, true);
  const item = document.createElement("li");
  item.innerHTML =
    '<a href="#"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6"/></svg>Delete job</a>';
  const style = document.createElement("style");
  style.textContent =
    ".contextMenu .bic-delete-menu a{position:relative;background-image:none}.contextMenu .bic-delete-menu svg{position:absolute;left:5px;top:50%;transform:translateY(-50%)}";
  document.head.append(style);
  item.className = "bic-delete-menu";
  item.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (job) open(job);
    },
    true,
  );
  menu.append(item);
}
