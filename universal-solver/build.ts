import { watch } from 'node:fs';
import pkg from './package.json' with { type: 'json' };

const REPO = 'https://github.com/quantavil/userscript';
const OUT = 'dist/universal-solver.user.js';

const header = `// ==UserScript==
// @name         Universal Captcha Solver
// @namespace    ${REPO}
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       quantavil
// @license      MIT
// @homepageURL  ${REPO}/tree/main/universal-solver
// @downloadURL  ${REPO}/raw/main/universal-solver/${OUT}
// @updateURL    ${REPO}/raw/main/universal-solver/${OUT}
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// @connect      generativelanguage.googleapis.com
// @connect      api.groq.com
// @connect      openrouter.ai
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==
`;

async function build(): Promise<void> {
  const res = await Bun.build({
    entrypoints: ['src/main.ts'],
    target: 'browser',
    format: 'iife',
    // Left readable on purpose: script catalogs (Greasy Fork) reject minified userscripts.
    minify: false,
  });
  if (!res.success) {
    for (const log of res.logs) console.error(log);
    if (!process.argv.includes('--watch')) process.exit(1);
    return;
  }
  const code = await res.outputs[0]?.text();
  await Bun.write(OUT, `${header}\n${code}`);
  console.log(`built ${OUT} (${((code?.length ?? 0) / 1024).toFixed(1)} KB)`);
}

await build();
if (process.argv.includes('--watch')) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch('src', { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => void build(), 80);
  });
  console.log('watching src/ …');
}
