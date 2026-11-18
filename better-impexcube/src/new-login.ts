import { watchDom } from "./dom";

const newLoginText = /new login detected/i;

/**
 * jquery-confirm locks page scrolling with this class while a dialog is open.
 * Some close paths (including the automated Deny click) remove the dialog but
 * leave the class behind, so release it once no dialog remains.
 */
function releaseScrollLock(): void {
  if (
    document.body?.classList.contains("jconfirm-noscroll") &&
    !document.querySelector(".jconfirm, .jconfirm-box")
  ) {
    document.body.classList.remove("jconfirm-noscroll");
  }
}

/** Another browser logged in: answer the native prompt with Deny so this session continues. Once per box. */
export function installNewLoginDeny(): void {
  const answered = new WeakSet<Element>();
  watchDom(".jconfirm", () => {
    for (const box of document.querySelectorAll<HTMLElement>(".jconfirm-box")) {
      if (answered.has(box) || !newLoginText.test(box.textContent ?? ""))
        continue;
      const deny = [
        ...box.querySelectorAll<HTMLElement>(".buttons button"),
      ].find((button) => /^deny$/i.test(button.textContent?.trim() ?? ""));
      if (!deny) continue;
      answered.add(box);
      deny.click();
    }
    releaseScrollLock();
  });
}
