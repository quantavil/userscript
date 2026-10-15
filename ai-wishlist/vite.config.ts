import { defineConfig } from "vite-plus";
import preact from "@preact/preset-vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: { ignorePatterns: ["tests/fixtures/**"] },
  test: { environment: "jsdom", maxWorkers: 2 },
  plugins: [
    preact({ reactAliasesEnabled: false }),
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Amazon & Flipkart AI Wishlist",
        namespace: "http://github.com/quantavil/userscript",
        version: "2.0.0",
        description:
          "Adds a unified cross-platform AI wishlist with background specifications parsing for Amazon and Flipkart.",
        author: "quantavil",
        match: [
          "https://www.flipkart.com/*",
          "https://www.amazon.in/*",
          "https://www.amazon.com/*",
        ],
        license: "GPL-3.0-or-later",
        "run-at": "document-idle",
        grant: [
          "GM_getValue",
          "GM_setValue",
          "GM_xmlhttpRequest",
          "GM_registerMenuCommand",
          "GM_addValueChangeListener",
          "GM_removeValueChangeListener",
        ],
        connect: ["*"],
      },
    }),
  ],
});
