import { render } from "preact";
import { WishlistApp } from "../components/WishlistApp";
export function initWishlistUI(): () => void {
  const existing = document.getElementById("ai-wishlist-root");
  if (existing) return () => {};
  const root = document.createElement("div");
  root.id = "ai-wishlist-root";
  root.dataset.aiwOwned = "";
  document.body.appendChild(root);
  render(<WishlistApp />, root);
  if (typeof GM_registerMenuCommand !== "undefined")
    GM_registerMenuCommand("Clear Cache & All Data", () =>
      window.dispatchEvent(new CustomEvent("aiw-reset-requested")),
    );
  return () => {
    render(null, root);
    root.remove();
  };
}
