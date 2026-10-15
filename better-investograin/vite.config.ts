import { defineConfig, lazyPlugins } from "vite-plus";
import monkey from "vite-plugin-monkey";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  build: { outDir: "dist" },
  plugins: lazyPlugins(() => [
    monkey({
      entry: "src/main.ts",
      build: { fileName: "better-investograin.user.js" },
      userscript: {
        name: "Better InvestorGain",
        namespace: "https://github.com/quantavil/userscript/",
        version: "1.2.0",
        description:
          "Hides ads, broker affiliate promo bars, sponsor strips, and partner footer sections on InvestorGain.com — keeping only the IPO data you care about.",
        author: "quantavil",
        match: ["*://*.investorgain.com/*"],
        grant: [],
        license: "GPL-3.0-or-later",
        "run-at": "document-start",
      },
    }),
  ]),
});
