import formStyles from "./form-style.css?inline";
import publicStyles from "./public-style.css?inline";
import sharedStyles from "./site-style.css?inline";

/** Theme native controls without replacing their handlers or postbacks. */
export function installFormStyle(): void {
  const style = document.createElement("style");
  style.textContent = [sharedStyles, formStyles, publicStyles].join("\n");
  (document.head ?? document.documentElement).append(style);
}
