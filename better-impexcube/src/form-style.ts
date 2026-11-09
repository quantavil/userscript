import formStyles from "./form-style.css?inline";
import sharedStyles from "./site-style.css?inline";

/** Theme native controls without replacing their handlers or postbacks. */
export function installFormStyle(): void {
  const style = document.createElement("style");
  style.textContent = `${sharedStyles}\n${formStyles}`;
  (document.head ?? document.documentElement).append(style);
}
