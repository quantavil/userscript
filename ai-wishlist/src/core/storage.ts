export const WISHLIST_KEY = "priceStdz_wishlist";
export const SETTINGS_KEY = "priceStdz_settings";
export function reportStorageError(error: unknown) {
  window.dispatchEvent(
    new CustomEvent("storage-error", {
      detail: error instanceof Error ? error.message : String(error),
    }),
  );
}
export function writeStored(key: string, value: unknown, event: string): boolean {
  try {
    GM_setValue(key, value);
    window.dispatchEvent(new CustomEvent(event));
    return true;
  } catch (error) {
    reportStorageError(error);
    return false;
  }
}
/** One subscription bridge owns both local events and remote GM listeners. */
export function subscribeStorage(listener: () => void): () => void {
  window.addEventListener("wishlist-updated", listener);
  window.addEventListener("settings-updated", listener);
  const ids: number[] = [];
  if (typeof GM_addValueChangeListener !== "undefined") {
    for (const [key, event] of [
      [WISHLIST_KEY, "wishlist-updated"],
      [SETTINGS_KEY, "settings-updated"],
    ] as const) {
      ids.push(
        GM_addValueChangeListener(key, (_key, _old, _value, remote) => {
          if (remote) window.dispatchEvent(new CustomEvent(event, { detail: { remote: true } }));
        }),
      );
    }
  }
  return () => {
    window.removeEventListener("wishlist-updated", listener);
    window.removeEventListener("settings-updated", listener);
    if (typeof GM_removeValueChangeListener !== "undefined")
      ids.forEach(GM_removeValueChangeListener);
  };
}
