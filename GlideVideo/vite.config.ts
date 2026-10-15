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
  define: {
    "process.env.VITEST": "false",
  },
  plugins: lazyPlugins(() => [
    monkey({
      entry: "src/index.ts",
      userscript: {
        name: "GlideVideo: Better Video Controls with Gesture for Mobile Web",
        namespace: "https://github.com/quantavil/userscript/GlideVideo",
        version: pkg.version,
        description: pkg.description,
        icon: "https://raw.githubusercontent.com/quantavil/userscript/main/GlideVideo/extension/icon.svg",
        match: ["*://*/*"],
        grant: ["GM_registerMenuCommand", "GM_getValue", "GM_setValue", "GM_deleteValue"],
        license: "GPL-3.0-or-later",
        "run-at": "document-start",
      },
      build: {
        fileName: "glidevideo.user.js",
      },
    }),
  ]),
  build: {
    minify: false,
    target: "es2022",
  },
});
