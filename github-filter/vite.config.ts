import { readFileSync } from "node:fs";
import { defineConfig, lazyPlugins } from "vite-plus";
import monkey from "vite-plugin-monkey";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    monkey({
      entry: "src/index.ts",
      userscript: {
        name: "GitHub Advanced Search",
        namespace: "https://github.com/quantavil/userscript/github-filter",
        version: pkg.version,
        description: pkg.description,
        match: ["https://github.com/*"],
        grant: ["GM_registerMenuCommand"],
        noframes: true,
        icon: "https://github.githubassets.com/favicons/favicon.svg",
        license: "GPL-3.0-or-later",
        "run-at": "document-idle",
      },
      build: {
        fileName: "github-filter.user.js",
      },
    }),
  ]),
  build: {
    minify: false,
    target: "es2022",
  },
});
