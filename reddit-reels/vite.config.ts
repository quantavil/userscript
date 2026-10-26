import { defineConfig, lazyPlugins } from "vite-plus";
import monkey, { cdn } from "vite-plugin-monkey";

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
        name: "Reddit Reels",
        namespace: "https://github.com/quantavil/userscript/tree/main/reddit-reels",
        match: ["https://www.reddit.com/*", "https://reddit.com/*"],
        noframes: true,
        description:
          "Mobile-first full-screen reels for Reddit feeds: swipe, one stream with sound, Reddit video and RedGifs, native voting.",
        author: "quantavil",
        version: "3.2.1",
        license: "GPL-3.0-or-later",
        "run-at": "document-end",
        homepage: "https://github.com/quantavil/userscript/tree/main/reddit-reels",
        supportURL: "https://github.com/quantavil/userscript/issues",
        grant: ["GM_getValue", "GM_setValue", "GM_xmlhttpRequest"],
        connect: ["api.redgifs.com", "media.redgifs.com", "redgifs.com"],
      },
      build: {
        externalGlobals: {
          "hls.js": cdn.jsdelivr("Hls", "dist/hls.min.js"),
        },
      },
    }),
  ]),
  build: {
    minify: false,
    cssMinify: false,
    target: "es2022",
  },
});
