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
        name: "texpander-ai",
        namespace: "https://github.com/quantavil/texpander-ai",
        version: "3.0.0",
        description: "AI-powered text expander with Gemini integration",
        author: "quantavil",
        match: ["*://*/*"],
        grant: [
          "GM_getValue",
          "GM_setValue",
          "GM_registerMenuCommand",
          "GM_addStyle",
          "GM_xmlhttpRequest",
        ],
        connect: ["generativelanguage.googleapis.com"],
        "run-at": "document-start",
        license: "GPL-3.0-or-later",
      },
      build: { externalGlobals: {} },
    }),
  ]),
});
