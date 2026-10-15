import { defineConfig, lazyPlugins } from "vite-plus";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Babepedia Advanced Filter & Badges",
        namespace: "quantavil/bpedia",
        version: "2.4.0",
        description:
          "Advanced filtering and on-thumbnail stats/badges for Babepedia list pages with dynamic progress scraper and responsive Apple Glassmorphic UI.",
        author: "quantavil",
        license: "GPL-3.0-or-later",
        match: ["https://www.babepedia.com/*", "https://babepedia.com/*"],
        connect: ["www.babepedia.com", "babepedia.com"],
        grant: [
          "GM_setValue",
          "GM_getValue",
          "GM_deleteValue",
          "GM_listValues",
          "GM_xmlhttpRequest",
        ],
        "run-at": "document-end",
      },
      build: {
        fileName: "bpedia-filter.user.js",
      },
    }),
  ]),
  build: {
    minify: false,
  },
});
