import { defineConfig, lazyPlugins } from "vite-plus";
import monkey from "vite-plugin-monkey";
import { readFileSync } from "fs";

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
      entry: "src/main.ts",
      userscript: {
        name: "Form Genie",
        namespace: "https://github.com/quantavil/userscript/form-genie",
        version: pkg.version,
        description: pkg.description,
        author: "quantavil",
        license: "GPL-3.0-or-later",
        match: ["http://*/*", "https://*/*"],
        grant: [
          "GM_getValue",
          "GM_setValue",
          "GM_deleteValue",
          "GM_registerMenuCommand",
          "GM_xmlhttpRequest",
        ],
        connect: ["generativelanguage.googleapis.com"],
        "run-at": "document-idle",
        noframes: true,
      },
      build: {
        fileName: "form-genie.user.js",
      },
    }),
  ]),
  build: {
    minify: false,
    target: "esnext",
  },
});
