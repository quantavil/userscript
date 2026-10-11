import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Omarchy Plugins Enhancer",
        namespace: "https://github.com/quantavil/userscript/",
        version: "1.2.0",
        description:
          "Auto pager next (infinite scroll), direct GitHub links on cards, and grey out or collapse seen plugins on plugins.omarchy.org",
        author: "quantavil",
        match: ["https://plugins.omarchy.org/*"],
        grant: ["GM_getValue", "GM_setValue", "GM_addStyle"],
        license: "GPL-3.0-or-later",
      },
    }),
  ],
});
