import { build, context } from "esbuild";
import { readFileSync } from "node:fs";

const banner = readFileSync("meta.txt", "utf-8").trim();
const isWatch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const opts = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/google-ai-brave.user.js",
  format: "iife",
  target: "es2022",
  charset: "utf8",
  minify: false,          // keep output readable — it's a userscript
  treeShaking: true,
  banner: { js: banner },
  logLevel: "info",
};

if (isWatch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log("👀  Watching for changes…");
} else {
  await build(opts);
}