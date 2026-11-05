import { installContextSwitch } from "./context-switch";
import { installDates } from "./dates";
import { installDbk } from "./dbk";
import { installDropdowns } from "./dropdown";
import { installJobDelete } from "./job-delete";
import { installJobSearch } from "./job-search";
import { installLoginDefaults } from "./login";
import { installProductUi } from "./product-ui";

installLoginDefaults();
void installContextSwitch();
installJobDelete();
installJobSearch();
installDropdowns();
installDates();
installDbk();
installProductUi();
