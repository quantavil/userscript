import { watchDom } from "./dom";

const promoText = /subscribe|newsletter|news letter|webinar|special offer/i;
const dismissLabel = /^(close|cancel|no,? thanks|not now|later|dismiss|×|x)$/i;

/** Promo popups: image-only jquery-confirm banners and newsletter/subscribe dialogs. Real dialogs (security notices, forms) stay. */
export function installAnnouncementDismiss(): void {
  const dismissed = new WeakSet<Element>();

  const closeButton = (root: Element): HTMLElement | null =>
    root.querySelector<HTMLElement>(
      ".closeIcon, .btn-close, button.close, [data-dismiss='modal'], [data-bs-dismiss='modal']",
    ) ??
    [...root.querySelectorAll<HTMLElement>("button, a.btn, .btn")].find(
      (button) => dismissLabel.test(button.textContent?.trim() ?? ""),
    ) ??
    null;

  const dismiss = (box: Element) => {
    dismissed.add(box);
    if (!closeButton(box)?.click()) (box as HTMLElement).hidden = true;
  };

  watchDom(".jconfirm, .modal", () => {
    for (const box of document.querySelectorAll<HTMLElement>(
      ".jconfirm-box, .modal-dialog",
    )) {
      if (dismissed.has(box)) continue;
      const content = box.querySelector(".content, .modal-body") ?? box;
      const imageOnly =
        !!box.querySelector(".content img") &&
        !content.textContent?.trim() &&
        !box.querySelector("input, select, textarea, .buttons button");
      if (imageOnly || promoText.test(box.textContent ?? "")) dismiss(box);
    }
  });
}
