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
      build: { fileName: "better-alternativeto.user.js" },
      userscript: {
        name: "Better AlternativeTo",
        namespace: "https://github.com/quantavil/userscript/",
        version: "1.1.0",
        description:
          "Shows website/GitHub/app-store/social links straight on the cards, pins a compact filter bar with search + likes range, and puts dark mode in the header.",
        author: "quantavil",
        match: ["*://*.alternativeto.net/*"],
        grant: [],
        license: "GPL-3.0-or-later",
      },
    }),
  ]),
});
