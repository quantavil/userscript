import { watchDom } from "./dom";

const newLoginText = /new login detected/i;

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
  });
}
