import { spawnSync } from 'node:child_process';
import { readdirSync, renameSync, rmSync, utimesSync, watch } from 'node:fs';
import pkg from './package.json' with { type: 'json' };

const REPO = 'https://github.com/quantavil/userscript';
const OUT = 'dist/universal-solver.user.js';
const EXT = 'dist/firefox';
const ZIP = 'dist/universal-solver-firefox.zip';
const ICON = await Bun.file('icon.svg').text();

const header = `// ==UserScript==
// @name         Universal Captcha Solver
// @namespace    ${REPO}
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       quantavil
// @license      ${pkg.license}
// @icon         data:image/svg+xml;base64,${Buffer.from(ICON.replace(/\s*\n\s*/g, '')).toString('base64')}
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
// @connect      hcaptcha.com
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==
`;

/** GPL notice at the top of every shipped script. */
const NOTICE = `// Universal Captcha Solver ${pkg.version}. Copyright (C) quantavil.
// Licensed under ${pkg.license}: ${REPO}/blob/main/universal-solver/LICENSE
// This program comes with ABSOLUTELY NO WARRANTY.
`;

/** Firefox (desktop and Android), Manifest V3. Firefox runs `background.scripts` as an event page. */
const manifest = {
  manifest_version: 3,
  name: 'Universal Captcha Solver',
  version: pkg.version,
  description: pkg.description,
  homepage_url: `${REPO}/tree/main/universal-solver`,
  icons: { 48: 'icon.svg', 96: 'icon.svg', 128: 'icon.svg' },
  action: { default_title: 'Universal Captcha Solver', default_popup: 'popup.html', default_icon: 'icon.svg' },
  background: { scripts: ['background.js'] },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['gm-shim.js', 'content.js'],
      all_frames: true,
      match_about_blank: true,
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
  browser_specific_settings: {
    gecko: {
      id: 'universal-captcha-solver@quantavil',
      strict_min_version: '140.0',
      // Captcha images and audio go to the AI provider the user configures.
      data_collection_permissions: { required: ['websiteContent'] },
    },
    gecko_android: { strict_min_version: '142.0' },
  },
};

async function bundle(entry: string): Promise<string | null> {
  const res = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    format: 'iife',
    // Left readable on purpose: script catalogs (Greasy Fork, AMO review) reject minified code.
    minify: false,
  });
  if (!res.success) {
    for (const log of res.logs) console.error(log);
    if (!process.argv.includes('--watch')) process.exit(1);
    return null;
  }
  return (await res.outputs[0]?.text()) ?? null;
}

async function buildUserscript(): Promise<void> {
  const code = await bundle('src/userscript.ts');
  if (code === null) return;
  await Bun.write(OUT, `${header}\n${NOTICE}${code}`);
  console.log(`built ${OUT} (${(code.length / 1024).toFixed(1)} KB)`);
}

async function buildExtension(): Promise<void> {
  rmSync(EXT, { recursive: true, force: true });
  const scripts = {
    'gm-shim': 'src/ext/gm-shim.ts',
    content: 'src/ext/content.ts',
    background: 'src/ext/background.ts',
    popup: 'src/ext/popup.ts',
  };
  for (const [name, entry] of Object.entries(scripts)) {
    const code = await bundle(entry);
    if (code === null) return;
    await Bun.write(`${EXT}/${name}.js`, `${NOTICE}${code}`);
  }
  await Bun.write(`${EXT}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await Bun.write(`${EXT}/popup.html`, Bun.file('src/ext/popup.html'));
  await Bun.write(`${EXT}/icon.svg`, ICON);
  await Bun.write(`${EXT}/LICENSE`, Bun.file('LICENSE'));

  // Fixed timestamps keep the zip byte-identical between builds of the same sources.
  const files = readdirSync(EXT).sort();
  const epoch = new Date('2020-01-01T00:00:00Z');
  for (const f of files) utimesSync(`${EXT}/${f}`, epoch, epoch);
  const tmp = `${ZIP}.tmp`;
  rmSync(tmp, { force: true });
  const zip = spawnSync('zip', ['-X', '-q', '-D', `../${tmp.split('/').pop()}`, ...files], { cwd: EXT });
  const zipped = !zip.error && zip.status === 0;
  if (zipped) renameSync(tmp, ZIP);
  else console.warn(`kept the old ${ZIP}: building it needs the zip command`);
  console.log(`built ${EXT}/ (${files.length} files)${zipped ? ` and ${ZIP}` : ''}`);
}

async function build(): Promise<void> {
  await buildUserscript();
  await buildExtension();
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
