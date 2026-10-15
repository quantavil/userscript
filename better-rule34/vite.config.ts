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
      build: { fileName: "better-rule34.user.js" },
      userscript: {
        name: "Better Rule34Video",
        namespace: "https://github.com/quantavil/userscript/",
        version: "2.0.0",
        description:
          "Rule34Video enhancements: in-sheet minimum rating and view count filters, seamless infinite scroll, viewport preview autoplay, watch history tracking, and ad cleanup.",
        match: [
          "*://*.rule34video.com/*",
          "*://rule34video.com/*",
          "*://*.rule35video.com/*",
          "*://rule35video.com/*",
        ],
        license: "GPL-3.0-or-later",
        "run-at": "document-end",
      },
    }),
  ]),
});
