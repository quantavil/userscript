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
      build: { fileName: "better-wallhaven.user.js" },
      userscript: {
        name: "Better Wallhaven",
        namespace: "https://github.com/quantavil/userscript/",
        version: "1.1.0",
        description:
          "Grid size control, per-thumb data with SVG actions and in-thumbnail detail sheet, zero-fetch browsing, opt-in 4KB API details for wallhaven.cc.",
        match: ["*://wallhaven.cc/*"],
        grant: ["GM_addStyle", "GM_xmlhttpRequest", "GM_download"],
        connect: ["w.wallhaven.cc", "wallhaven.cc"],
        license: "GPL-3.0-or-later",
        "run-at": "document-end",
      },
    }),
  ]),
});
