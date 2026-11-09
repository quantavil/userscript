import { installContextSwitch } from "./context-switch";
import { installDates } from "./dates";
import { installDbk } from "./dbk";
import { installDropdowns } from "./dropdown";
import { installFormStyle } from "./form-style";
import { installInvoiceDate } from "./invoice-date";
import { installJobDelete } from "./job-delete";
import { installJobSearch } from "./job-search";
import { installLoginDefaults } from "./login";
import { installProductUi } from "./product-ui";

// Apply the theme before the site paints; enhancements need the completed DOM.
installFormStyle();

function initialize(): void {
  installLoginDefaults();
  void installContextSwitch();
  installJobDelete();
  installJobSearch();
  installDropdowns();
  installDates();
  installDbk();
  installProductUi();
  installInvoiceDate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
