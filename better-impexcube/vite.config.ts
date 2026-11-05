import monkey from "vite-plugin-monkey";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Better ImpexCube",
        namespace: "https://github.com/quantavil/userscript",
        version: "1.2.0",
        description:
          "Searchable dropdowns, smarter dates and RITC-specific DBK suggestions for ImpexCube",
        match: ["*://impexcube.in/*", "*://*.impexcube.in/*"],
        license: "GPL-3.0-or-later",
        "run-at": "document-end",
        grant: ["GM_addStyle", "GM_xmlhttpRequest", "unsafeWindow"],
        connect: ["impexcube.in"],
      },
    }),
  ],
  build: { minify: false },
});
