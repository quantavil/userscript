// ==UserScript==
// @name                Beautiful Greasy Fork (Enhanced)
// @namespace           https://github.com/quantavil
// @version             2.2.0
// @description         Adds script icons, HTML toolbar with full tools, direct download button, syntax highlight, and UI improvements
// @author              quantavil
// @license             CC-BY-NC-ND-4.0
// @match               https://greasyfork.org/*
// @icon                https://greasyfork.org/vite/assets/blacklogo96-CxYTSM_T.png
// @connect             update.greasyfork.org
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_xmlhttpRequest
// @run-at              document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  // ----------------
  // ICONS (full set)
  // ----------------
  const icons = {
    "h": "<svg viewBox=\"0 0 16 16\"><path d=\"M3.75 2a.75.75 0 0 1 .75.75V7h7V2.75a.75.75 0 0 1 1.5 0v10.5a.75.75 0 0 1-1.5 0V8.5h-7v4.75a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 3.75 2Z\"></path></svg>",
    "info": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z\"/></svg>",
    "bold": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 26 26\"><path fill=\"currentColor\" d=\"M22.94 18.05a5.3 5.3 0 0 1-.7 2.82 5 5 0 0 1-2.03 1.83q-1.4.71-3.21 1c-1.22.2-1.65.3-3.3.3H2v-1.78c.32-.03 2.03-.43 2.03-1.96V6.06C4.03 4.2 2.32 3.97 2 3.92V2h11.95c3.01 0 3.64.41 4.98 1.24q2 1.25 2 3.66c0 3.09-2.47 4.93-3.28 5.11v.3c.8.08 5.3.95 5.3 5.74m-7.5-10.23A2.5 2.5 0 0 0 14.4 5.7c-.68-.51-1.49-.77-2.86-.77a24 24 0 0 0-1.58.05v6.1h.8c1.68 0 2.69-.3 3.48-.88q1.2-.87 1.2-2.37m.8 9.65q0-1.74-1.3-2.68c-.87-.62-1.9-.93-3.54-.93l-.75.02-.7.03v7.17h2.32q1.76 0 2.87-.94a3.3 3.3 0 0 0 1.1-2.66\"/></svg>",
    "italic": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 8 8\"><path fill=\"currentColor\" d=\"M2 0v1h1.63l-.06.13-2 5-.34.88H.01v1h5v-1H3.38l.06-.13 2-5L5.78 1H7V0z\"/></svg>",
    "underline": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 384 512\"><path fill=\"currentColor\" d=\"M0 32A32 32 0 0 1 32 0h64a32 32 0 1 1 0 64v160a96 96 0 0 0 192 0V64a32 32 0 1 1 0-64h64a32 32 0 1 1 0 64v160a160 160 0 1 1-320 0V64A32 32 0 0 1 0 32m0 448a32 32 0 0 1 32-32h320a32 32 0 1 1 0 64H32a32 32 0 0 1-32-32\"/></svg>",
    "strikethrough": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M496 224H293.9l-87.2-26.8a43.6 43.6 0 0 1 12.9-85.2h66.7a50 50 0 0 1 44.7 27.6 16 16 0 0 0 21.5 7.1l42.9-21.4a16 16 0 0 0 7.2-21.5l-.6-1A128 128 0 0 0 287.5 32h-68a123.7 123.7 0 0 0-123 135.6c2 21 10.1 39.9 21.8 56.4H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h480a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16m-180.2 96a43 43 0 0 1 20.2 36.4 43.6 43.6 0 0 1-43.6 43.6h-66.7a50 50 0 0 1-44.7-27.6 16 16 0 0 0-21.5-7.1l-42.9 21.4a16 16 0 0 0-7.2 21.5l.6 1A128 128 0 0 0 224.5 480h68a123.7 123.7 0 0 0 123-135.6 114 114 0 0 0-5.3-24.4z\"/></svg>",
    "link": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.5\" d=\"M8 12h8M9 8H6a4 4 0 1 0 0 8h3m6-8h3a4 4 0 0 1 0 8h-3\"/></svg>",
    "quote": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 304 384\"><path fill=\"currentColor\" d=\"m21 299 43-86H0V85h128v128l-43 86zm171 0 43-86h-64V85h128v128l-43 86z\"/></svg>",
    "code": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><path fill=\"currentColor\" d=\"m278.9 511.5-61-17.7a12 12 0 0 1-8.2-14.9L346.2 8.7A12 12 0 0 1 361.1.5l61 17.7a12 12 0 0 1 8.2 14.9L293.8 503.3a12 12 0 0 1-14.9 8.2m-114-112.2 43.5-46.4a12 12 0 0 0-.8-17.2L117 256l90.6-79.7a12 12 0 0 0 .8-17.2l-43.5-46.4a12 12 0 0 0-17-.5L3.8 247.2a12 12 0 0 0 0 17.5l144.1 135.1a12 12 0 0 0 17-.5m327.2.6 144.1-135.1a12 12 0 0 0 0-17.5L492.1 112.1a12 12 0 0 0-17 .5L431.6 159a12 12 0 0 0 .8 17.2L523 256l-90.6 79.7a12 12 0 0 0-.8 17.2l43.5 46.4a12 12 0 0 0 17 .6\"/></svg>",
    "code_block": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\"><path fill=\"currentColor\" d=\"M52 52v152h28a12 12 0 0 1 0 24H40a12 12 0 0 1-12-12V40a12 12 0 0 1 12-12h40a12 12 0 0 1 0 24Zm164-24h-40a12 12 0 0 0 0 24h28v152h-28a12 12 0 0 0 0 24h40a12 12 0 0 0 12-12V40a12 12 0 0 0-12-12\"/></svg>",
    "ul": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1792 1408\"><path fill=\"currentColor\" d=\"M384 1216q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136m0-512q0 80-56 136t-136 56-136-56T0 704t56-136 136-56 136 56 56 136m1408 416v192q0 13-9.5 22.5t-22.5 9.5H544q-13 0-22.5-9.5T512 1312v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5M384 192q0 80-56 136t-136 56-136-56T0 192 56 56 192 0t136 56 56 136m1408 416v192q0 13-9.5 22.5T1760 832H544q-13 0-22.5-9.5T512 800V608q0-13 9.5-22.5T544 576h1216q13 0 22.5 9.5t9.5 22.5m0-512v192q0 13-9.5 22.5T1760 320H544q-13 0-22.5-9.5T512 288V96q0-13 9.5-22.5T544 64h1216q13 0 22.5 9.5T1792 96\"/></svg>",
    "ol": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M24 56a24 24 0 0 1 24-24h32a24 24 0 0 1 24 24v120h16a24 24 0 1 1 0 48H40a24 24 0 1 1 0-48h16V80h-8a24 24 0 0 1-24-24m62.7 285.2a15.3 15.3 0 0 0-24 1.2l-11.2 15.5A24 24 0 0 1 12.4 330l11.1-15.6a63.4 63.4 0 1 1 98.1 79.8L86.8 432H120a24 24 0 1 1 0 48H32a24.1 24.1 0 0 1-17.7-40.3l72-78c5.3-5.8 5.4-14.6.3-20.5zM224 64h256a32 32 0 1 1 0 64H224a32 32 0 1 1 0-64m0 160h256a32 32 0 1 1 0 64H224a32 32 0 1 1 0-64m0 160h256a32 32 0 1 1 0 64H224a32 32 0 1 1 0-64\"/></svg>",
    "image": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 42 42\"><path fill=\"currentColor\" d=\"M.5 7.5v27c0 2.5.5 3 3 3h34c2.5 0 3-.5 3-3v-27c0-2.5-.5-3-3-3h-34c-2.5 0-3 .4-3 3m35.3 23H5.2c3.4-4.9 9.3-13 10.8-13s6.4 6.6 8.7 8.9c0 0 2.9-3.9 4.4-3.9s6.6 8 6.7 8m-9-17a3.7 3.7 0 1 1 7.4 0 3.7 3.7 0 0 1-7.4 0\"/></svg>",
    "video": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M0 3.75C0 2.78.78 2 1.75 2h12.5c.97 0 1.75.78 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .14.11.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25Z\"/><path fill=\"currentColor\" d=\"M6 10.56V5.44a.25.25 0 0 1 .38-.21l4.26 2.56a.25.25 0 0 1 0 .42l-4.26 2.56a.25.25 0 0 1-.38-.21\"/></svg>",
    "subscript": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M32 64C14.3 64 0 78.3 0 96s14.3 32 32 32h15.3l89.6 128l-89.6 128H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c10.4 0 20.2-5.1 26.2-13.6L176 311.8l85.8 122.6c6 8.6 15.8 13.6 26.2 13.6h32c17.7 0 32-14.3 32-32s-14.3-32-32-32h-15.3l-89.6-128l89.6-128H320c17.7 0 32-14.3 32-32s-14.3-32-32-32h-32c-10.4 0-20.2 5.1-26.2 13.6L176 200.2L90.2 77.6C84.2 69.1 74.4 64 64 64H32zm448 256c0-11.1-5.7-21.4-15.2-27.2s-21.2-6.4-31.1-1.4l-32 16c-15.8 7.9-22.2 27.1-14.3 42.9C393 361.5 404.3 368 416 368v80c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32V320z\"/></svg>",
    "superscript": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M480 32c0-11.1-5.7-21.4-15.2-27.2s-21.2-6.4-31.1-1.4l-32 16c-15.8 7.9-22.2 27.1-14.3 42.9C393 73.5 404.3 80 416 80v80c-17.7 0-32 14.3-32 32s-14.3 32-32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32V32zM32 64C14.3 64 0 78.3 0 96s14.3 32 32 32h15.3l89.6 128l-89.6 128H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c10.4 0 20.2-5.1 26.2-13.6L176 311.8l85.8 122.6c6 8.6 15.8 13.6 26.2 13.6h32c17.7 0 32-14.3 32-32s-14.3-32-32-32h-15.3l-89.6-128l89.6-128H320c17.7 0 32-14.3 32-32s-14.3-32-32-32h-32c-10.4 0-20.2 5.1-26.2 13.6L176 200.2L90.2 77.6C84.2 69.1 74.4 64 64 64H32z\"/></svg>",
    "highlight": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" d=\"M3 1a1 1 0 0 0-1 1v2.5A1.5 1.5 0 0 0 3.5 6h-.05.1-.05 9-.05.1-.05A1.5 1.5 0 0 0 14 4.5V2a1 1 0 0 0-1-1zm0 6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2zm2 7.5V10h6v.74a1.5 1.5 0 0 1-.69 1.26l-4.54 2.92A.5.5 0 0 1 5 14.5\"/></svg>",
    "abbreviation": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 192 512\"><path fill=\"currentColor\" d=\"M20 424.229h20V279.771H20c-11.046 0-20-8.954-20-20V212c0-11.046 8.954-20 20-20h112c11.046 0 20 8.954 20 20v212.229h20c11.046 0 20 8.954 20 20V492c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-47.771c0-11.046 8.954-20 20-20zM96 0C56.235 0 24 32.235 24 72s32.235 72 72 72s72-32.235 72-72S135.764 0 96 0z\"/></svg>",
    "keyboard": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 16 16\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M3 4h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 12H3a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 3 4M0 5.5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3zm6.25 3.25a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5zM4.5 6.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m2 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4-1a1 1 0 1 1-2 0a1 1 0 0 1 2 0m2 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2m-8 2a1 1 0 1 1-2 0a1 1 0 0 1 2 0m8 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2\" clip-rule=\"evenodd\"/></svg>",
    "text_color": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\"><g fill=\"none\" stroke=\"currentColor\" stroke-linejoin=\"round\" stroke-width=\"4\"><rect width=\"36\" height=\"36\" x=\"6\" y=\"6\" rx=\"3\"/><path stroke-linecap=\"round\" d=\"M16 19v-3h16v3M22 34h4m-2-16v16\"/></g></svg>",
    "background_color": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\"><mask id=\"a\"><g fill=\"none\" stroke-linejoin=\"round\" stroke-width=\"4\"><rect width=\"36\" height=\"36\" x=\"6\" y=\"6\" fill=\"#fff\" stroke=\"#fff\" rx=\"3\"/><path stroke=\"#000\" stroke-linecap=\"round\" d=\"M16 19v-3h16v3M22 34h4m-2-16v16\"/></g></mask><path fill=\"currentColor\" d=\"M0 0h48v48H0z\" mask=\"url(#a)\"/></svg>",
    "table": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\"><path fill=\"currentColor\" d=\"M2 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 4h7v4H2zm0 10v-4h7v4zm16 0h-7v-4h7zm0-6h-7V6h7z\"/></svg>",
    "border": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M3 21V3h18v18zM5 5v14h14V5z\"/></svg>",
    "hr": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M1 10a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1\" clip-rule=\"evenodd\"/></svg>",
    "hr_style": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\"><path fill=\"currentColor\" d=\"M2 4.75A.75.75 0 0 1 2.75 4h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 2 4.75m6 0A.75.75 0 0 1 8.75 4h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 8 4.75m6 0a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75m-12 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75M3.25 14a1.25 1.25 0 1 0 0 2.5h13.5a1.25 1.25 0 1 0 0-2.5z\"/></svg>",
    "details": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M4.25 3A2.25 2.25 0 0 0 2.3 6.37l7.75 13.5a2.25 2.25 0 0 0 3.9 0l7.74-13.5A2.25 2.25 0 0 0 19.74 3z\"/></svg>",
    "center": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\"><path fill=\"currentColor\" d=\"M1 1h18v2H1zm0 8h18v2H1zm0 8h18v2H1zM4 5h12v2H4zm0 8h12v2H4z\"/></svg>"
  };

  // ----------------
  // CSS
  // ----------------
  const css = `
:root{
  --bg-primary:transparent;--bg-secondary:#f8fafc;--bg-card:#fff;--bg-read:#f1f5f9;--bg-comment-content:#f8f9fa;
  --text-primary:#1e293b;--text-secondary:#64748b;--text-muted:#94a3b8;--border-color:#e2e8f0;--border-accent:#3b82f6;
  --shadow:0 1px 3px rgba(0,0,0,.1);--shadow-hover:0 4px 12px rgba(0,0,0,.15);
  --rating-ok:#f59e0b;--rating-good:#10b981;--rating-bad:#ff2d2d;
  --rating-ok-bg:#fef3c7;--rating-good-bg:#d1fae5;--rating-bad-bg:#fee2e2;
  --code-bg:#bacfdf82;--code-text:#e11d48;--link-color:#3b82f6;--link-hover:#2563eb;
  --sh-code-bg:#f8f9fa;--sh-comment:#64748b;--sh-comment-special:#16a34a;--sh-keyword:#d946ef;--sh-string:#22c55e;--sh-number:#f97316;--sh-operator:#ef4444;--sh-punctuation:#64748b;--sh-tag-punctuation:#64748b;--sh-tag-name:#3b82f6;--sh-attribute:#9333ea;--sh-function:#14b8a6;--sh-property:#14b8a6;--sh-json-key:#be123c;--sh-regex:#f59e0b
}
@media (prefers-color-scheme:dark){
  :root{
    --bg-secondary:#151b22;--bg-card:#1e293b;--bg-read:#1a1a1a;--bg-comment-content:#0d1117;
    --text-primary:#f1f5f9;--text-secondary:#cbd5e1;--text-muted:#64748b;--border-color:#147dff;--border-accent:#147dff;
    --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-hover:0 4px 12px rgba(0,0,0,.4);
    --rating-ok:#f7ff00;--rating-good:#00f500;--rating-bad:#ff0f0f;
    --rating-ok-bg:rgba(247,255,0,.35);--rating-good-bg:rgba(0,245,0,.35);--rating-bad-bg:rgba(209,0,0,.35);
    --code-bg:#353535;--code-text:#ff6d6d;--link-color:#63b3ed;--link-hover:#90cdf4;
    --sh-code-bg:#0d1117;--sh-comment:#94a3b8;--sh-comment-special:#4ade80;--sh-keyword:#c084fc;--sh-string:#4ade80;--sh-number:#fb923c;--sh-operator:#f87171;--sh-punctuation:#94a3b8;--sh-tag-punctuation:#94a3b8;--sh-tag-name:#60a5fa;--sh-attribute:#a78bfa;--sh-function:#2dd4bf;--sh-property:#2dd4bf;--sh-json-key:#f472b6;--sh-regex:#f59e0b
  }
}
/* Toolbar */
.txt-editor-container{border-radius:8px;margin:10px 0;border:1px solid var(--border-color);overflow:hidden}
.txt-editor-container.light-theme{background:#fff}
.txt-editor-container.dark-theme{background:#0d1117;border-color:#3d444d}
.txt-editor-toolbar{display:flex;flex-direction:column;gap:6px;padding:8px;background:linear-gradient(180deg, rgba(0,0,0,0.02), transparent)}
.tools-basic,.tools-advanced{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.tools-advanced{display:none}
.txt-editor-container.tools-expanded .tools-advanced{display:flex}
.more-toggle{margin-left:auto;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-weight:600;background:#e9eef5;color:#34495e}
.dark-theme .more-toggle{background:#14191f;color:#d1dae4;border:1px solid #2a2f36}
.more-toggle:hover{filter:brightness(1.05)}
.txt-editor-toolbar-button{background:none;border:none;cursor:pointer;padding:6px;border-radius:6px;color:#57606a;display:inline-flex;align-items:center;gap:6px}
.txt-editor-toolbar-button svg{width:16px;height:16px}
.light-theme .txt-editor-toolbar-button:hover{background:#ebecf0;color:#24292f}
.dark-theme .txt-editor-toolbar-button{color:#9198a1}
.dark-theme .txt-editor-toolbar-button:hover{background:#212830;color:#fcf0f0ff}
.txt-editor-toolbar-divider{height:22px;width:1px;background:var(--border-color);margin:0 6px}
.txt-color-picker-container{display:flex;align-items:center;background-color:var(--bg-secondary);border:1px solid var(--border-color);padding:3px;border-radius:8px;gap:2px}
.txt-color-picker-input{width:32px;height:32px;border:none;background:none;cursor:pointer}
.txt-editor-container textarea{border:0;border-top:1px solid rgba(0,0,0,.05);width:100% !important;min-height:180px;padding:10px;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;resize:vertical}
.light-theme textarea{background:#fff;color:#24292f}
.dark-theme textarea{background:#0d1117;color:#f0f6fc;border-top-color:#3d444d}

/* Description blockquote and misc UI */
.script-description-blockquote{margin:15px 0!important;padding:12px 15px;border-radius:6px;background:#e0e0e0;border-left:4px solid #670000;color:#131313}
@media (prefers-color-scheme:dark){.script-description-blockquote{background:#1c2128;border-left:4px solid #e95757;color:#fff}}
.user-content a{color:var(--link-color);text-decoration:none;transition:color .2s ease}
.user-content a:hover{color:var(--link-hover);text-decoration:underline}

/* Discussion cards */
.script-discussion-list{display:flex;flex-direction:column;gap:1rem;padding:1rem 0;background:var(--bg-primary)}
.discussion-list-container{background:var(--bg-card);box-shadow:var(--shadow);border:1px solid var(--border-color);border-left:4px solid var(--border-accent);border-right:4px solid var(--border-accent);transition:all .2s ease;position:relative;overflow:hidden;cursor:pointer}
.discussion-list-container:hover{box-shadow:var(--shadow-hover);transform:translateY(-1px)}
.discussion-list-container:has(.rating-icon-ok){border-left-color:var(--rating-ok);border-right-color:var(--rating-ok)}
.discussion-list-container:has(.rating-icon-good){border-left-color:var(--rating-good);border-right-color:var(--rating-good)}
.discussion-list-container:has(.rating-icon-bad){border-left-color:var(--rating-bad);border-right-color:var(--rating-bad)}
.discussion-list-item{padding:1.25rem 1.5rem;position:relative}
.discussion-title{display:flex;gap:.75rem;text-decoration:none;color:inherit}
.rating-icon{flex-shrink:0;padding:.25rem .5rem;font-size:.75rem;font-weight:600;text-transform:uppercase;border:none}
.rating-icon-ok{background:var(--rating-ok-bg);color:var(--rating-ok)}
.rating-icon-good{background:var(--rating-good-bg);color:var(--rating-good)}
.rating-icon-bad{background:var(--rating-bad-bg);color:var(--rating-bad)}
.bgs-info-separator{height:3px;border:none;background-color:#b1b8c0;margin:1.5em 0}
@media (prefers-color-scheme:dark){.bgs-info-separator{background-color:#4e5761}}

/* Code highlight */
.user-content pre{background:var(--bg-secondary);border:1px solid var(--sh-punctuation);border-radius:6px;padding:1rem;overflow-x:auto;margin:1rem 0}
.sh-keyword{color:var(--sh-keyword);font-weight:bold}.sh-string{color:var(--sh-string)}.sh-number{color:var(--sh-number)}
.sh-comment{color:var(--sh-comment);font-style:italic}.sh-comment-special{color:var(--sh-comment-special);font-style:italic}
.sh-operator{color:var(--sh-operator)}.sh-punctuation{color:var(--sh-punctuation)}
.sh-function,.sh-property{color:var(--sh-function)}.sh-tag-punctuation{color:var(--sh-tag-punctuation)}
.sh-tag-name{color:var(--sh-tag-name);font-weight:bold}.sh-attribute{color:var(--sh-attribute)}.sh-json-key{color:var(--sh-json-key)}.sh-regex{color:var(--sh-regex)}

@media (max-width:768px){
  .txt-editor-toolbar{gap:8px}
}
`;
  GM_addStyle(css);

  // ----------------
  // STATE / KEYS
  // ----------------
  const CACHE_KEY = 'IconCache';
  const LAST_TEXT_COLOR_KEY = 'LastColor';
  const LAST_BG_COLOR_KEY = 'LastBgColor';
  let iconCache = {};
  const processedKeys = new Set();

  // ----------------
  // UTILS
  // ----------------
  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
  const now = () => Date.now();
  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const isScriptPage = () => /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?scripts\/\d+-[^/]+$/.test(location.pathname);
  const isCodePage = () => /^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?scripts\/\d+-.+\/code/.test(location.pathname);
  const isMarkdownPage = () => {
    const p = location.pathname;
    if (p.includes('/sets/')) return false;
    return ['/new', '/edit', '/feedback', '/discussions'].some(seg => p.includes(seg));
  };

  const normalizeScriptPath = (pathname) =>
    pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?\//, '/').match(/^\/scripts\/\d+-[^/]+/)?.[0] || null;

  const extractScriptIdFromNormalizedPath = (normalized) => normalized?.match(/\/scripts\/(\d+)-/)?.[1] || null;

  const highlight = (code) => {
    const keywords = new Set(['const','let','var','function','return','if','else','for','while','of','in','async','await','try','catch','new','import','export','from','class','extends','super','true','false','null','undefined','document','window']);
    const tokenDefs = [
      { type: 'url', regex: /^(https?:\/\/[^\s"'`<>]+)/ },
      { type: 'comment-special', regex: /^(\/\/[^\r\n]*)/ },
      { type: 'comment', regex: /^(\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/ },
      { type: 'string', regex: /^(`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')/ },
      { type: 'regex', regex: /^(\/(?!\*)(?:[^\r\n/\\]|\\.)+\/[gimyus]*)/ },
      { type: 'number', regex: /^\b-?(\d+(\.\d+)?)\b/ },
      { type: 'keyword', regex: new RegExp(`^\\b(${Array.from(keywords).join('|')})\\b`) },
      { type: 'function', regex: /^([a-zA-Z_][\w_]*)(?=\s*\()/ },
      { type: 'property', regex: /^\.([a-zA-Z_][\w_]*)/ },
      { type: 'operator', regex: /^(==?=?|!=?=?|=>|[+\-*/%&|^<>]=?|\?|:|=)/ },
      { type: 'punctuation', regex: /^([,;(){}[\]])/ },
      { type: 'whitespace', regex: /^\s+/ },
      { type: 'unknown', regex: /^./ }
    ];
    let out = [], cur = 0, s = escapeHtml(code);
    while (cur < s.length) {
      let matched = false;
      for (const def of tokenDefs) {
        const m = def.regex.exec(s.slice(cur));
        if (!m) continue;
        let content = m[0];
        if (def.type === 'function' && keywords.has(content)) continue;
        out.push({ type: def.type, content });
        cur += content.length; matched = true; break;
      }
      if (!matched) { out.push({ type: 'unknown', content: s[cur] }); cur++; }
    }
    return out.map(t => {
      if (['whitespace','unknown','url'].includes(t.type)) return t.content;
      if (t.type === 'property') return `<span class="sh-punctuation">.</span><span class="sh-property">${t.content.slice(1)}</span>`;
      return `<span class="sh-${t.type}">${t.content}</span>`;
    }).join('');
  };

  const applySyntaxHighlighting = () => {
    qsa('pre code:not([data-highlighted="true"])').forEach(block => {
      block.innerHTML = highlight(block.textContent);
      block.dataset.highlighted = 'true';
    });
  };

  const saveCache = async () => { await GM_setValue(CACHE_KEY, iconCache); };

  // ----------------
  // UI ENHANCEMENTS
  // ----------------
  const addAdditionalInfoSeparator = () => {
    const el = document.getElementById('additional-info');
    if (el && !el.previousElementSibling?.matches('hr.bgs-info-separator')) {
      const hr = document.createElement('hr');
      hr.className = 'bgs-info-separator';
      el.before(hr);
    }
  };

  const highlightScriptDescription = () => {
    qsa('#script-description, .script-description.description').forEach(el => {
      if (el.dataset.bgfWrapped === '1') return;
      if (el.parentElement?.tagName === 'BLOCKQUOTE') { el.dataset.bgfWrapped = '1'; return; }
      const scriptLink = el.closest('article, li')?.querySelector('a.script-link');
      const path = scriptLink ? normalizeScriptPath(new URL(scriptLink.href, location.origin).pathname)
                              : normalizeScriptPath(location.pathname);
      const block = document.createElement('blockquote');
      block.className = 'script-description-blockquote';
      if (path) block.dataset.bgfPath = path;
      el.parentNode.insertBefore(block, el);
      block.appendChild(el);
      el.dataset.bgfWrapped = '1';
    });
  };

  // delegated click: discussion items become clickable
  document.addEventListener('click', (e) => {
    const container = e.target.closest('.discussion-list-container');
    if (!container) return;
    if (e.target.closest('a, .user-link, .badge-author, .rating-icon')) return;
    const link = container.querySelector('.discussion-title');
    if (link?.href) location.href = link.href;
  }, { passive: true });

  // ----------------
  // ICON FETCH/CACHE
  // ----------------
  const createIconElement = (src, big = false) => {
    const img = document.createElement('img');
    img.src = src; img.alt = ''; img.loading = 'lazy'; img.dataset.bgfIcon = '1';
    img.style.cssText = big
      ? 'width:80px;height:80px;margin-right:10px;vertical-align:middle;border-radius:4px;object-fit:contain;pointer-events:none;'
      : 'width:40px;height:40px;margin-right:8px;vertical-align:middle;border-radius:3px;object-fit:contain;pointer-events:none;';
    return img;
  };

  const extractMetadataFromContent = (content) => {
    if (typeof content !== 'string') return {};
    const meta = {};
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('// ==/UserScript==')) break;
      if (!line.startsWith('// @')) continue;
      const m = line.match(/\/\/\s*(@icon)\s+(.+)/);
      if (m) { meta['@icon'] = m[2].trim(); break; }
    }
    return meta;
  };

  const processScript = async (normalizedPath, target, big = false) => {
    if (!normalizedPath || !target || target.querySelector('img[data-bgf-icon]')) return;

    if (processedKeys.has(normalizedPath)) {
      const cached = iconCache[normalizedPath];
      if (cached?.iconUrl) target.prepend(createIconElement(cached.iconUrl, big));
      return;
    }
    processedKeys.add(normalizedPath);

    const cached = iconCache[normalizedPath];
    const ts = now();
    if (cached && ts - cached.ts < 7 * 24 * 60 * 60 * 1000) {
      if (cached.iconUrl) target.prepend(createIconElement(cached.iconUrl, big));
      return;
    }

    const id = extractScriptIdFromNormalizedPath(normalizedPath);
    if (!id) { iconCache[normalizedPath] = { ts }; await saveCache(); return; }

    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://update.greasyfork.org/scripts/${id}.js`,
      timeout: 8000,
      onload: async (res) => {
        const text = typeof res.responseText === 'string' ? res.responseText : '';
        const raw = extractMetadataFromContent(text);
        const iconUrl = raw['@icon'] || null;
        iconCache[normalizedPath] = { iconUrl, ts: now() };
        await saveCache();
        if (iconUrl) target.prepend(createIconElement(iconUrl, big));
      },
      onerror: async () => { iconCache[normalizedPath] = { ts: now() }; await saveCache(); }
    });
  };

  const processIconElements = () => {
    qsa('a.script-link:not([data-icon-processed])').forEach(a => {
      a.dataset.iconProcessed = '1';
      const normalized = normalizeScriptPath(new URL(a.getAttribute('href'), location.origin).pathname);
      processScript(normalized, a, false);
    });
    const header = qs('header');
    if (header) {
      const h2 = qs('h2', header);
      const desc = qs('p.script-description', header);
      if (h2 && desc && !h2.dataset.bgfHeaderIcon) {
        h2.dataset.bgfHeaderIcon = '1';
        processScript(normalizeScriptPath(location.pathname), h2, true);
      }
    }
  };

  // ----------------
  // HTML EDITOR (extended)
  // ----------------
  const sanitizeUrl = (u) => {
    try {
      const url = new URL(u, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : null;
    } catch { return null; }
  };

  const listify = (ta, type) => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = ta.value.substring(s, e).trim();
    const lines = (selected || 'Item 1\nItem 2\nItem 3').split(/\r?\n/).filter(l => l.length);
    const li = lines.map(l => `  <li>${l}</li>`).join('\n');
    const markup = `<${type}>\n${li}\n</${type}>`;
    ta.setRangeText(markup, s, e, 'end'); ta.focus();
  };

  const insertTableSnippet = (ta, borderColor) => {
    let rows = parseInt(prompt('Rows (1-10)?', '2'), 10);
    let cols = parseInt(prompt('Columns (1-10)?', '2'), 10);
    rows = Math.min(Math.max(rows || 2, 1), 10);
    cols = Math.min(Math.max(cols || 2, 1), 10);
    const td = `<td style="border:1px solid ${borderColor}; padding:6px;">Cell</td>`;
    const tr = `<tr>${Array(cols).fill(td).join('')}</tr>`;
    const body = Array(rows).fill(tr).join('\n');
    const table = `<table style="border-collapse:collapse;width:100%;border:1px solid ${borderColor};">\n<tbody>\n${body}\n</tbody>\n</table>`;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(table, s, e, 'end'); ta.focus();
  };

  async function createTextStyleEditor(textarea) {
    if (!textarea || textarea.dataset.editorApplied) return;
    textarea.dataset.editorApplied = 'true';

    // keyboard helpers
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { e.preventDefault(); this.setRangeText('   ', this.selectionStart, this.selectionEnd, 'end'); }
      if (e.shiftKey && e.key === 'Enter') { e.preventDefault(); this.setRangeText('\n<br>\n', this.selectionStart, this.selectionEnd, 'end'); }
    });

    const container = document.createElement('div');
    container.className = 'txt-editor-container';
    const toolbar = document.createElement('div');
    toolbar.className = 'txt-editor-toolbar';

    // theme
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (isDark) => {
      container.classList.toggle('dark-theme', isDark);
      container.classList.toggle('light-theme', !isDark);
    };
    applyTheme(mq.matches);
    mq.addEventListener?.('change', (e) => applyTheme(e.matches));

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'txt-editor-toolbar-rows';
    const rowBasic = document.createElement('div'); rowBasic.className = 'tools-basic';
    const rowAdv = document.createElement('div'); rowAdv.className = 'tools-advanced';

    const borderColor = () => container.classList.contains('dark-theme') ? '#3d444d' : '#d0d7de';

    const insertText = (ta, prefix, suffix = '', placeholder = '') => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const selected = ta.value.substring(s, e);
      const text = selected || placeholder;
      if (!selected && !placeholder) {
        ta.setRangeText(prefix + suffix, s, e);
        const pos = s + prefix.length;
        ta.setSelectionRange(pos, pos);
      } else {
        ta.setRangeText(prefix + text + suffix, s, e, selected ? 'end' : 'select');
      }
      ta.focus();
    };

    const btn = (title, icon, action) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'txt-editor-toolbar-button'; b.title = title; b.innerHTML = icon;
      b.addEventListener('click', (e) => { e.preventDefault(); action(); });
      return b;
    };
    const divider = () => {
      const d = document.createElement('div');
      d.className = 'txt-editor-toolbar-divider';
      return d;
    };
    const addColorPicker = async (title, icon, key, defaultColor, cssProp, targetRow = rowBasic) => {
      const wrap = document.createElement('div'); wrap.className = 'txt-color-picker-container';
      const input = document.createElement('input'); input.type = 'color'; input.className = 'txt-color-picker-input';
      input.value = await GM_getValue(key, defaultColor);
      input.addEventListener('input', async (e) => { await GM_setValue(key, e.target.value); });
      const colorBtn = btn(title, icon, () => insertText(textarea, `<span style="${cssProp}:${input.value};">`, '</span>', `${title.toLowerCase()} text`));
      wrap.append(input, colorBtn);
      targetRow.appendChild(wrap);
    };

    // BASIC row
    rowBasic.append(
      btn('Bold', icons.bold, () => insertText(textarea, '<strong>', '</strong>', 'bold text')),
      btn('Italic', icons.italic, () => insertText(textarea, '<em>', '</em>', 'italic text')),
      btn('Underline', icons.underline, () => insertText(textarea, '<u>', '</u>', 'underlined')),
      btn('Strikethrough', icons.strikethrough, () => insertText(textarea, '<s>', '</s>', 'struck')),
      divider(),
      btn('Link', icons.link, () => {
        const href = prompt('Enter URL (http/https):', 'https://');
        const safe = href && sanitizeUrl(href);
        if (safe) insertText(textarea, `<a href="${safe}">`, '</a>', 'link text');
      }),
      btn('Quote', icons.quote, () => insertText(textarea, '\n<blockquote>\n  ', '\n</blockquote>\n', 'quote')),
      btn('Inline code', icons.code, () => insertText(textarea, '<code>', '</code>', 'code'))
    );

    // add color pickers to basic row
    await addColorPicker('Text Color', icons.text_color, LAST_TEXT_COLOR_KEY, '#58a6ff', 'color', rowBasic);
    await addColorPicker('Background Color', icons.background_color, LAST_BG_COLOR_KEY, '#fffb91', 'background-color', rowBasic);

    // More toggle
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'more-toggle';
    moreBtn.textContent = 'More ▾';
    moreBtn.addEventListener('click', () => {
      const exp = container.classList.toggle('tools-expanded');
      moreBtn.textContent = exp ? 'Less ▴' : 'More ▾';
    });
    rowBasic.append(divider(), moreBtn);

    // ADVANCED row
    rowAdv.append(
      // lists
      btn('Bulleted list', icons.ul, () => listify(textarea, 'ul')),
      btn('Numbered list', icons.ol, () => listify(textarea, 'ol')),
      divider(),
      // code block
      btn('Code block', icons.code_block, () => insertText(textarea, '\n<pre><code>\n', '\n</code></pre>\n', 'code here')),
      divider(),
      // inline extras
      btn('Subscript', icons.subscript, () => insertText(textarea, '<sub>', '</sub>', 'sub')),
      btn('Superscript', icons.superscript, () => insertText(textarea, '<sup>', '</sup>', 'sup')),
      btn('Highlight', icons.highlight, () => insertText(textarea, '<mark>', '</mark>', 'highlight')),
      btn('Abbreviation', icons.abbreviation, () => {
        const title = prompt('Abbreviation title (tooltip):', 'HyperText Markup Language') || '';
        insertText(textarea, `<abbr title="${title}">`, '</abbr>', 'HTML');
      }),
      btn('Keyboard input', icons.keyboard, () => insertText(textarea, '<kbd>', '</kbd>', 'Ctrl+C')),
      divider(),
      // media
      btn('Image', icons.image, () => {
        const src = prompt('Image URL (http/https):', 'https://');
        const safe = src && sanitizeUrl(src);
        if (!safe) return;
        const alt = prompt('Alt text:', '') || '';
        const w = prompt('Width (px, optional):', '') || '';
        const style = `style="max-width:100%${w ? `;width:${parseInt(w,10)||''}px` : ''};"`;
        insertText(textarea, `<img src="${safe}" alt="${alt}" ${style}>`);
      }),
      btn('Video', icons.video, () => {
        const src = prompt('Video URL (http/https):', 'https://');
        const safe = src && sanitizeUrl(src);
        if (!safe) return;
        const w = prompt('Width (px, optional):', '') || '';
        const style = w ? ` style="max-width:100%;width:${parseInt(w,10)||''}px;"` : ' style="max-width:100%;"';
        insertText(textarea, `<video controls src="${safe}"${style}>`, '</video>', 'Your browser does not support the video tag.');
      }),
      divider(),
      // blocks
      btn('Table', icons.table, () => insertTableSnippet(textarea, borderColor())),
      btn('Border box', icons.border, () => {
        const bc = borderColor();
        insertText(textarea, `<div style="border:1px solid ${bc};padding:8px;border-radius:6px;">`, '</div>', 'content');
      }),
      btn('Horizontal rule', icons.hr, () => insertText(textarea, '\n<hr>\n')),
      btn('Styled HR', icons.hr_style, () => {
        const style = (prompt('HR style (solid, dashed, dotted):', 'dashed') || 'dashed').toLowerCase();
        const color = prompt('Color (hex or named):', container.classList.contains('dark-theme') ? '#3d444d' : '#d0d7de') || '#d0d7de';
        insertText(textarea, `\n<hr style="border:none;border-top:1px ${style} ${color};">\n`);
      }),
      btn('Details/summary', icons.details, () => {
        const summary = prompt('Summary text:', 'Details') || 'Details';
        insertText(textarea, `<details>\n  <summary>${summary}</summary>\n  `, `\n</details>\n`, 'Hidden content');
      }),
      btn('Center', icons.center, () => insertText(textarea, `<div style="text-align:center;">`, `</div>`, 'centered text')),
      divider(),
      // headings and info
      btn('Heading (H1–H6)', icons.h, () => {
        let level = parseInt(prompt('Heading level 1–6:', '2'), 10);
        level = Math.min(Math.max(level || 2, 1), 6);
        insertText(textarea, `<h${level}>`, `</h${level}>`, `Heading ${level}`);
      }),
      btn('Info / Tips', icons.info, () => {
        alert('Shortcuts:\n\n- Tab: insert 3 spaces\n- Shift+Enter: insert <br>\n\nTips:\n- Select text before clicking a tool to wrap it.\n- Without a selection, many tools insert placeholders.\n- Use the More toggle to access advanced tools.');
      })
    );

    rowsWrap.append(rowBasic, rowAdv);
    toolbar.append(rowsWrap);
    textarea.parentNode.insertBefore(container, textarea);
    container.append(toolbar, textarea);
  }

  const applyToAllTextareas = () => {
    qsa('textarea:not(#script_version_code):not([data-editor-applied])').forEach(createTextStyleEditor);
  };

  // ----------------
  // DOWNLOAD BUTTON
  // ----------------
  const initializeDownloadButton = () => {
    const waitFor = (sel) => new Promise((resolve) => {
      const el = qs(sel);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const el2 = qs(sel);
        if (el2) { obs.disconnect(); resolve(el2); }
      });
      obs.observe(document, { childList: true, subtree: true });
    });

    waitFor('label[for="wrap-lines"]').then((label) => {
      const wrap = document.getElementById('wrap-lines');
      if (wrap) wrap.checked = false;

      const toolbar = label?.parentElement;
      if (!toolbar || toolbar.querySelector('.bgf-download-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'btn bgf-download-btn';
      btn.textContent = 'Download';
      btn.style.cssText = 'margin-left:12px;background-color:#005200;color:white;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;';
      btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#1e971e');
      btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#005200');

      btn.addEventListener('click', () => {
        const normalized = normalizeScriptPath(location.pathname);
        const id = extractScriptIdFromNormalizedPath(normalized);
        if (!id) return alert('Could not identify script ID');

        const url = `https://update.greasyfork.org/scripts/${id}.js`;
        btn.disabled = true; btn.textContent = 'Downloading...';

        GM_xmlhttpRequest({
          method: 'GET',
          url,
          onload: (res) => {
            const code = res.responseText || '';
            if (!code) { alert('Code not found'); return; }
            const nameMatch = code.match(/\/\/\s*@name\s+(.+)/i);
            let fileName = (nameMatch ? nameMatch[1].trim() : 'script') + '.user.js';
            fileName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
            const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = fileName; document.body.appendChild(a); a.click();
            a.remove(); URL.revokeObjectURL(a.href);
          },
          onerror: () => alert('Download error'),
          ontimeout: () => alert('Download timeout'),
          onloadend: () => { btn.disabled = false; btn.textContent = 'Download'; }
        });
      });

      toolbar.appendChild(btn);
    });
  };

  // ----------------
  // MAIN
  // ----------------
  const run = () => {
    processIconElements();
    highlightScriptDescription();
    if (isScriptPage()) addAdditionalInfoSeparator();
    if (isMarkdownPage()) applyToAllTextareas();
    if (isCodePage()) initializeDownloadButton();
    applySyntaxHighlighting();
  };

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; run(); });
  };

  (async () => {
    iconCache = await GM_getValue(CACHE_KEY, {}) || {};
    run();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
  })();
})();