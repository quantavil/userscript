/// <reference types="vite-plus" />
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
        name: "Reddit Manager",
        namespace: "https://github.com/quantavil/userscript/reddit-manager",
        version: pkg.version,
        description: pkg.description,
        // old.reddit.com serves the same API on the same cookies; the script
        // reads location.origin so each host talks to itself and stays
        // same-origin. sh.reddit.com is what mobile lands on.
        match: ["https://www.reddit.com/*", "https://old.reddit.com/*", "https://sh.reddit.com/*"],
        grant: [],
        license: "GPL-3.0-or-later",
        "run-at": "document-idle",
      },
      build: {
        fileName: "reddit-manager.user.js",
      },
    }),
  ]),
  build: {
    minify: false,
    target: "es2022",
  },
  test: {
    environment: "happy-dom",
  },
});
