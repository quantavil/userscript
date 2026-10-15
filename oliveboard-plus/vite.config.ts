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
        name: "Oliveboard Plus",
        namespace: "ob-enhancer",
        version: "1.3.0",
        description: "Enhance Oliveboard UI and functionality.",
        author: "quantavil",
        match: ["*://*.oliveboard.in/*"],
        "run-at": "document-start",
        grant: [],
        license: "GPL-3.0-or-later",
      },
    }),
  ]),
});
