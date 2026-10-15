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
        name: "Testbook Plus",
        namespace: "tb-plus",
        version: "2.2.0",
        description:
          "Enhances Testbook UI, blocks tracking, and auto-crawls & downloads question papers as clean Markdown.",
        author: "quantavil",
        match: ["https://testbook.com/*", "https://*.testbook.com/*"],
        "run-at": "document-start",
        grant: [],
        license: "GPL-3.0-or-later",
      },
    }),
  ]),
});
