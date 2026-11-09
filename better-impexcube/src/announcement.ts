import { watchDom } from "./dom";

/** Promo banners arrive as an image-only jquery-confirm dialog; close them, leave real dialogs alone. */
export function installAnnouncementDismiss(): void {
  const dismissed = new WeakSet<Element>();
  watchDom(".jconfirm", () => {
    for (const box of document.querySelectorAll<HTMLElement>(".jconfirm-box")) {
      const content = box.querySelector(".content");
      if (
        dismissed.has(box) ||
        !content?.querySelector("img") ||
        content.textContent?.trim() ||
        box.querySelector("input, select, textarea, .buttons button")
      )
        continue;
      dismissed.add(box);
      box.querySelector<HTMLElement>(".closeIcon")?.click();
    }
  });
}
