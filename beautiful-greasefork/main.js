// ==UserScript==
// @name                Beautiful Greasy Fork 
// @namespace           https://github.com/quantavil
// @version             2.0.1
// @description         Lightweight version: adds script icons, HTML toolbar for editing, direct download button, and interface improvements
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

(function () {
    'use strict';

    // ================
    // EMBEDDED ICONS (No CDN)
    // ================
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
        "superscript": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M480 32c0-11.1-5.7-21.4-15.2-27.2s-21.2-6.4-31.1-1.4l-32 16c-15.8 7.9-22.2 27.1-14.3 42.9C393 73.5 404.3 80 416 80v80c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32V32zM32 64C14.3 64 0 78.3 0 96s14.3 32 32 32h15.3l89.6 128l-89.6 128H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c10.4 0 20.2-5.1 26.2-13.6L176 311.8l85.8 122.6c6 8.6 15.8 13.6 26.2 13.6h32c17.7 0 32-14.3 32-32s-14.3-32-32-32h-15.3l-89.6-128l89.6-128H320c17.7 0 32-14.3 32-32s-14.3-32-32-32h-32c-10.4 0-20.2 5.1-26.2 13.6L176 200.2L90.2 77.6C84.2 69.1 74.4 64 64 64H32z\"/></svg>",
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

    // ================
    // EMBEDDED CSS (No CDN)
    // ================
    const customCSS = `:root {
    --bg-primary: transparent;
    --bg-secondary: #f8fafc;
    --bg-card: #ffffff;
    --bg-read: #f1f5f9;
    --bg-comment-content: #f8f9fa;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    --border-color: #e2e8f0;
    --border-accent: #3b82f6;
    --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.15);
    --rating-ok: #f59e0b;
    --rating-good: #10b981;
    --rating-bad: #ff2d2d;
    --rating-ok-bg: #fef3c7;
    --rating-good-bg: #d1fae5;
    --rating-bad-bg: #fee2e2;
    --code-bg: #bacfdf82;
    --code-text: #e11d48;
    --link-color: #3b82f6;
    --link-hover: #2563eb;
    --sh-code-bg: #f8f9fa;
    --sh-comment: #64748b;
    --sh-comment-special: #16a34a;
    --sh-keyword: #d946ef;
    --sh-string: #22c55e;
    --sh-number: #f97316;
    --sh-operator: #ef4444;
    --sh-punctuation: #64748b;
    --sh-tag-punctuation: #64748b;
    --sh-tag-name: #3b82f6;
    --sh-attribute: #9333ea;
    --sh-function: #14b8a6;
    --sh-property: #14b8a6;
    --sh-json-key: #be123c;
    --sh-regex: #f59e0b;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: transparent;
        --bg-secondary: #151b22;
        --bg-card: #1e293b;
        --bg-read: #1a1a1a;
        --bg-comment-content: #0d1117;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-muted: #64748b;
        --border-color: #147dff;
        --border-accent: #147dff;
        --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        --shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
        --rating-ok: #f7ff00;
        --rating-good: #00f500;
        --rating-bad: #ff0f0f;
        --rating-ok-bg: rgba(247, 255, 0, 0.35);
        --rating-good-bg: rgba(0, 245, 0, 0.35);
        --rating-bad-bg: rgba(209, 0, 0, 0.35);
        --code-bg: #353535;
        --code-text: #ff6d6d;
        --link-color: #63b3ed;
        --link-hover: #90cdf4;
        --sh-code-bg: #0d1117;
        --sh-comment: #94a3b8;
        --sh-comment-special: #4ade80;
        --sh-keyword: #c084fc;
        --sh-string: #4ade80;
        --sh-number: #fb923c;
        --sh-operator: #f87171;
        --sh-punctuation: #94a3b8;
        --sh-tag-punctuation: #94a3b8;
        --sh-tag-name: #60a5fa;
        --sh-attribute: #a78bfa;
        --sh-function: #2dd4bf;
        --sh-property: #2dd4bf;
        --sh-json-key: #f472b6;
        --sh-regex: #f59e0b;
    }
}

.txt-editor-container {
    border-radius: 6px;
    margin: 10px 0;
}

.light-theme textarea {
    background-color: #ffffff;
    color: #24292f;
    border-top: 1px solid #d0d7de;
}

.dark-theme textarea {
    background-color: #0d1117;
    color: #f0f6fc;
    border-top: 1px solid #3d444d;
}

.txt-editor-container textarea {
    border: 0;
    border-radius: 0 0 6px 6px;
    width: 100% !important;
    min-height: 180px;
    padding: 10px;
    box-sizing: border-box;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    resize: vertical;
}
.txt-editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 8px 5px;
}

.txt-editor-toolbar-button,
.txt-editor-toolbar-select {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    margin: 0 2px;
    border-radius: 6px;
    position: relative;
}

.txt-editor-toolbar-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
    vertical-align: middle;
}

.txt-editor-toolbar-button[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;
    margin-bottom: 5px;
}

.txt-editor-toolbar-divider {
    margin: 4px 8px;
    height: 30px;
}

.txt-editor-toolbar-select {
    -webkit-appearance: none;
    appearance: none;
    padding-right: 20px;
    background-repeat: no-repeat;
    background-position: right 6px center;
}

.txt-color-picker-container {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    padding: 3px;
    margin: 0 4px;
    border-radius: 8px;
    gap: 2px;
}

.txt-color-picker-input {
    width: 32px !important;
    height: 32px !important;
    box-sizing: border-box;
    padding: 0;
    border: none !important;
    background: none;
    cursor: pointer;
}

.txt-color-picker-input::-webkit-color-swatch {
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.2);
}

.txt-color-picker-input::-moz-color-swatch {
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.2);
}

@media (prefers-color-scheme: dark) {
    .txt-color-picker-container {
        background-color: #0d1117;
        border-color: #3d444d;
    }
    
    .txt-color-picker-input::-webkit-color-swatch,
    .txt-color-picker-input::-moz-color-swatch {
         border-color: rgba(255, 255, 255, 0.2);
    }
}

.txt-editor-container.light-theme {
    background-color: #ffffff;
    border: 1px solid #d0d7de;
}

.light-theme .txt-editor-toolbar {
    background-color: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
}

.light-theme .txt-editor-toolbar-button,
.light-theme .txt-editor-toolbar-select {
    color: #57606a;
}

.light-theme .txt-editor-toolbar-button:hover,
.light-theme .txt-editor-toolbar-select:hover {
    background-color: #ebecf0;
    color: #24292f;
}

.light-theme .txt-editor-toolbar-button[data-tooltip]:hover::after {
    background-color: #24292f;
    color: #ffffff;
}

.light-theme .txt-editor-toolbar-divider {
    border-left: 1px solid #d0d7de;
}

.light-theme .txt-editor-toolbar-select {
    background-color: #f6f8fa;
}

.light-theme .txt-editor-toolbar-select option {
    background: #ffffff;
    color: #24292f;
}

.light-theme .txt-color-picker-input {
    border: 1px solid #d0d7de;
    background-color: #ffffff;
}

.txt-editor-container.dark-theme {
    background-color: #0d1117;
    border: 1px solid #3d444d;
}

.dark-theme .txt-editor-toolbar {
    background-color: #151b23f2;
    border-bottom: 1px solid #3d444d;
}

.dark-theme .txt-editor-toolbar-button,
.dark-theme .txt-editor-toolbar-select {
    color: #9198a1;
}

.dark-theme .txt-editor-toolbar-button:hover,
.dark-theme .txt-editor-toolbar-select:hover {
    background-color: #212830;
    color: #fcf0f0ff;
}

.dark-theme .txt-editor-toolbar-button[data-tooltip]:hover::after {
    background-color: #212830;
    color: #fcf0f7ff;
}

.dark-theme .txt-editor-toolbar-divider {
    border-left: 1px solid #3d444d;
}

.dark-theme .txt-editor-toolbar-select {
    background-color: #151b23;
}

.dark-theme .txt-editor-toolbar-select option {
    background: #0d1117;
    color: #f0f6fc;
}

.dark-theme .txt-color-picker-input {
    border: 1px solid #3d444d;
    background-color: #0d1117;
}

.lang-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: none;
    z-index: 2147483647;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
}

.lang-modal-box {
    padding: 24px;
    border-radius: 16px;
    width: min(90vw, 320px);
    text-align: center;
    transform: scale(0.95);
    opacity: 0;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-out;
}

.lang-modal-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.lang-modal-buttons button {
    padding: 14px;
    border-radius: 10px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    text-align: center;
    font-size: 1rem;
}

.lang-modal-box.light-theme {
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

.lang-modal-box.light-theme .lang-modal-buttons button {
    background-color: #f0f2f5;
    color: #333;
    border: 1px solid #ddd;
}

.lang-modal-box.light-theme .lang-modal-buttons button:hover {
    border-color: #0969da;
    background-color: #e6e8eb;
}

.lang-modal-box.dark-theme {
    background-color: rgba(30, 30, 32, 0.85);
    border: 1px solid #333;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.lang-modal-box.dark-theme .lang-modal-buttons button {
    background-color: #2a2d31;
    color: #e0e0e0;
    border: 1px solid #444;
}

.lang-modal-box.dark-theme .lang-modal-buttons button:hover {
    border-color: #58a6ff;
    background-color: #313438;
}

.script-description-blockquote {
    margin: 15px 0 !important;
    padding: 12px 15px;
    border-radius: 6px;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
    background-color: #e0e0e0ff;
    border-left: 4px solid #670000;
    color: #131313ff;
}

.script-description-blockquote * {
    font-weight: 600 !important;
    color: inherit !important;
}

@media (prefers-color-scheme: dark) {
    .script-description-blockquote {
        background-color: #1c2128;
        border-left: 4px solid #e95757;
        color: #ffffffff;
    }
}

.good-rating-count,
.ok-rating-count,
.bad-rating-count {
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    font-size: 1.15em;
    padding: 2px 3px;
    border-radius: 5px;
    transition: background-color 0.2s ease;
}

.good-rating-count {
    color: #1f883d;
}

.ok-rating-count {
    color: #6e7781;
}

.bad-rating-count {
    color: #cf222e;
}

.good-rating-count:hover {
    background-color: rgba(31, 136, 61, 0.1);
}

.ok-rating-count:hover {
    background-color: rgba(110, 119, 129, 0.1);
}

.bad-rating-count:hover {
    background-color: rgba(207, 34, 46, 0.1);
}

.good-rating-count::before {
    content: '👍';
    margin-right: 3px;
}

.ok-rating-count::before {
    content: '🤔';
    margin-right: 3px;
}

.bad-rating-count::before {
    content: '👎';
    margin-right: 3px;
}

@media (prefers-color-scheme: dark) {
    .ok-rating-count {
        color: #ccbf1c;
    }

    .good-rating-count:hover {
        background-color: rgba(46, 160, 67, 0.15);
    }

    .ok-rating-count:hover {
        background-color: rgba(139, 148, 158, 0.15);
    }

    .bad-rating-count:hover {
        background-color: rgba(248, 81, 73, 0.15);
    }
}

.script-list-ratings {
    align-self: center;
}

.script-list-ratings+dd {
    align-self: center;
    white-space: nowrap;
}

.bgs-info-separator {
    height: 3px;
    border: none;
    background-color: #b1b8c0;
    margin: 1.5em 0;
}

@media (prefers-color-scheme: dark) {
    .bgs-info-separator {
        background-color: #4e5761;
    }
}

.user-link {
    color: var(--border-accent);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
    position: relative;
}

.user-link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--border-accent);
    transition: width 0.3s ease;
}

.user-link:hover::after {
    width: 100%;
}

.script-discussion-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem 0;
    background: var(--bg-primary);
}

.discussion-list-container {
    background: var(--bg-card);
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--border-accent);
    border-right: 4px solid var(--border-accent);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
}

.discussion-list-container:has(.rating-icon-ok) {
    border-left-color: var(--rating-ok);
    border-right-color: var(--rating-ok);
}

.discussion-list-container:has(.rating-icon-good) {
    border-left-color: var(--rating-good);
    border-right-color: var(--rating-good);
}

.discussion-list-container:has(.rating-icon-bad) {
    border-left-color: var(--rating-bad);
    border-right-color: var(--rating-bad);
}

.discussion-list-container:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-1px);
}

.discussion-list-item {
    padding: 1.25rem 1.5rem;
    position: relative;
}

.discussion-list-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    cursor: pointer;
}

.discussion-list-container>* {
    position: relative;
    z-index: 2;
}

.discussion-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
    width: 100%;
}

.discussion-meta-item:first-child {
    flex: 1;
    min-width: 200px;
}

.discussion-meta-item:last-child {
    margin-left: auto;
    text-align: right;
    flex-shrink: 0;
}

.discussion-meta-item:last-child .discussion-meta-item {
    justify-content: flex-end;
    text-align: right;
}

.discussion-meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
}

.discussion-title {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    text-decoration: none;
    color: inherit;
    transition: color 0.2s ease;
    position: relative;
    z-index: 2;
}

.rating-icon {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.125rem;
    border: none;
    position: relative;
    z-index: 3;
}

.rating-icon-ok {
    background: var(--rating-ok-bg);
    color: var(--rating-ok);
}

.rating-icon-good {
    background: var(--rating-good-bg);
    color: var(--rating-good);
}

.rating-icon-bad {
    background: var(--rating-bad-bg);
    color: var(--rating-bad);
}

.discussion-snippet {
    line-height: 1.5;
    color: var(--text-primary);
    flex: 1;
    font-size: 0.95rem;
    margin: 0;
    position: relative;
    z-index: 2;
}

.badge-author {
    background: var(--border-accent);
    color: white;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    margin-left: 0.5rem;
    border: none;
    position: relative;
    z-index: 3;
}

.discussion-not-read {
    background: var(--bg-secondary);
}

.discussion-list-container.discussion-read {
    background: var(--bg-read);
    border-left-color: var(--border-color);
    border-right-color: var(--border-color);
    margin-left: 0px;
    margin-right: 0px;
}

.discussion-list-container.discussion-read:hover {
    background: var(--bg-card);
}

.discussion-list-container.discussion-read .discussion-snippet {
    color: var(--text-secondary);
}

.discussion-list-container.discussion-read .discussion-meta {
    color: var(--text-muted);
}

.discussion-list.discussion-list-logged-in {
    padding: 0 !important;
}

section#user-discussions-on-scripts-written>section.text-content {
    padding-left: 0px !important;
    padding-bottom: 0px !important;
    padding-right: 0px !important;
}

.comment {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.comment::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 4px;
    transition: width 0.3s ease;
}

.comment:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
}

.comment:hover::before {
    width: 6px;
}

.comment-meta {
    display: flex;
    flex-wrap: wrap;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.875rem;
    color: var(--text-secondary);
    align-items: stretch;
}

.comment-meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.comment-meta-item-main {
    font-weight: 600;
}

.self-link {
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.self-link:hover {
    background: var(--bg-secondary);
    color: var(--border-accent);
}

a.self-link,
a.self-link:visited {
    text-decoration: none;
    color: var(--border-accent);
    opacity: .3;
}

.quote-comment,
.report-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.quote-comment:hover {
    background: var(--bg-secondary);
    color: var(--border-accent);
}

.report-link:hover {
    background: var(--rating-bad-bg);
    color: var(--rating-bad);
}

.user-content {
    background: var(--bg-comment-content);
    border: transparent;
    line-height: 1.7;
    color: var(--text-primary);
    padding: 1.25rem;
    font-size: 0.95rem;
    word-wrap: break-word;
}

.user-content a {
    color: var(--link-color);
    text-decoration: none;
    transition: color 0.2s ease;
}

.user-contenta:hover {
    color: var(--link-hover);
    text-decoration: underline;
}

.user-content code {
    background: var(--code-bg);
    color: var(--code-text);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
}

.user-content pre code {
    background: transparent;
    padding: 0;
    color: var(--text-primary);
}

.user-content blockquote {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border-left: 3px solid var(--border-accent);
    border-radius: 0 4px 4px 0;
    color: var(--text-secondary);
}

.user-content strong {
    font-weight: 600;
}

.comment-author {
    background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
    border-left: 4px solid var(--rating-good);
}

.comment-author::before {
    background: var(--rating-good);
}

.comment-author .user-link::after {
    content: ' ✓';
    color: var(--rating-good);
}

.user-content pre {
    background: var(--bg-secondary);
    border: 1px solid var(--sh-punctuation);
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
}

.user-content pre code {
    background: transparent !important;
    padding: 0 !important;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    line-height: 1.5;
}

.sh-keyword {
    color: var(--sh-keyword);
    font-weight: bold;
}

.sh-string {
    color: var(--sh-string);
}

.sh-number {
    color: var(--sh-number);
}

.sh-comment {
    color: var(--sh-comment);
    font-style: italic;
}

.sh-comment-special {
    color: var(--sh-comment-special);
    font-style: italic;
}

.sh-operator {
    color: var(--sh-operator);
}

.sh-punctuation {
    color: var(--sh-punctuation);
}

.sh-function,
.sh-property {
    color: var(--sh-function);
}

.sh-tag-punctuation {
    color: var(--sh-tag-punctuation);
}

.sh-tag-name {
    color: var(--sh-tag-name);
    font-weight: bold;
}

.sh-attribute {
    color: var(--sh-attribute);
}

.sh-json-key {
    color: var(--sh-json-key);
}

.sh-regex {
    color: var(--sh-regex);
}

@media (max-width: 768px) {
    .discussion-meta {
        flex-direction: column;
        align-items: flex-start;
    }

    .discussion-meta-item:last-child {
        margin-left: 0;
        text-align: left;
        width: 100%;
    }

    .discussion-meta-item:last-child .discussion-meta-item {
        justify-content: flex-start;
        text-align: left;
    }

    .discussion-list-item {
        padding: 1rem;
    }

    .discussion-title {
        flex-direction: column;
        gap: 0.5rem;
    }

    .rating-icon {
        align-self: flex-start;
    }

    section#user-discussions-on-scripts-written>section.text-content {
        padding: 0 10px !important;
    }

    .comment {
        margin-bottom: 1rem;
    }

    .comment-meta {
        padding: 1rem;
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }

    .user-content {
        padding: 1rem;
    }
}

.user-link:focus {
    outline-offset: 1px;
}

.custom-prompt-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483646;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
}

.custom-prompt-box {
    padding: 24px;
    border-radius: 16px;
    width: min(90vw, 420px);
    transform: scale(0.95);
    opacity: 0;
    animation: prompt-appear 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes prompt-appear {
    to {
        transform: scale(1);
        opacity: 1;
    }
}

.custom-prompt-box form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.custom-prompt-box label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 500;
}

.custom-prompt-box input {
    padding: 10px;
    border-radius: 8px;
    font-size: 1rem;
    width: 100%;
    box-sizing: border-box;
}

.custom-prompt-buttons {
    display: flex;
    gap: 12px;
    margin-top: 12px;
    justify-content: flex-end;
}

.custom-prompt-buttons button {
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-size: 0.9rem;
}

.custom-alert-box {
    text-align: center;
}

.custom-alert-box p {
    margin: 0 0 20px 0;
    font-size: 1rem;
}

.custom-prompt-box.light-theme {
    background-color: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #24292f;
}

.light-theme .custom-prompt-box label {
    color: #57606a;
}

.light-theme .custom-prompt-box input {
    background-color: #ffffff;
    border: 1px solid #d0d7de;
    color: #24292f;
}

.light-theme .custom-prompt-box input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.3);
}

.light-theme .custom-prompt-buttons button.custom-prompt-confirm {
    background-color: #1f883d;
    color: white;
    border: 1px solid #1a7f37;
}
.light-theme .custom-prompt-buttons button.custom-prompt-confirm:hover {
    background-color: #1a7f37;
}

.light-theme .custom-prompt-buttons button.custom-prompt-cancel {
    background-color: #f6f8fa;
    color: #c93c37;
    border: 1px solid #d0d7de;
}
.light-theme .custom-prompt-buttons button.custom-prompt-cancel:hover {
    background-color: #f3f4f6;
    border-color: #c93c37;
}

.custom-prompt-box.dark-theme {
    background-color: #151b23;
    border: 1px solid #3d444d;
    color: #f0f6fc;
}

.dark-theme .custom-prompt-box label {
    color: #9198a1;
}

.dark-theme .custom-prompt-box input {
    background-color: #0d1117;
    border: 1px solid #3d444d;
    color: #f0f6fc;
}

.dark-theme .custom-prompt-box input:focus {
    outline: none;
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.3);
}

.dark-theme .custom-prompt-buttons button.custom-prompt-confirm {
    background-color: #238636;
    color: white;
    border: 1px solid #2ea043;
}
.dark-theme .custom-prompt-buttons button.custom-prompt-confirm:hover {
    background-color: #2ea043;
}

.dark-theme .custom-prompt-buttons button.custom-prompt-cancel {
    background-color: #21262d;
    color: #f87171;
    border: 1px solid #3d444d;
}

.dark-theme .custom-prompt-buttons button.custom-prompt-cancel:hover {
    background-color: #313438;
    border-color: #f87171;
}

.info-modal-box {
    text-align: center;
}

.info-modal-box h2 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 1.4rem;
}

.info-shortcuts {
    border-radius: 8px;
    padding: 16px;
    background-color: var(--bg-secondary);
}

.info-shortcuts table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.info-shortcuts th,
.info-shortcuts td {
    border: 1px solid var(--border-color);
    padding: 12px;
    vertical-align: middle;
}

.info-shortcuts th {
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
}

.info-shortcuts td:first-child {
    text-align: center;
    white-space: nowrap;
}

.info-shortcuts td:nth-child(2) {
    font-size: 0.9em;
    text-align: center;
}

.info-shortcuts code {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 4px 10px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    color: var(--text-primary);
    box-shadow: var(--shadow);
}

.info-modal-box .custom-prompt-buttons {
    justify-content: center;
    margin-top: 24px;
}`;

    GM_addStyle(customCSS);

    const CACHE_KEY = 'IconCache';
    const LAST_TAG_TYPE_KEY = 'LastTag';
    const LAST_COLOR_KEY = 'LastColor';

    let iconCache = {};
    const processedKeys = new Set();

    // ================
    // #region UTILITY FUNCTIONS
    // ================

    function isScriptPage() {
        const path = window.location.pathname;
        return /^\/([a-z]{2}(-[A-Z]{2})?\/)?scripts\/\d+-[^/]+$/.test(path);
    }

    function isCodePage() {
        return /^\/([a-z]{2}(-[A-Z]{2})?\/)?scripts\/\d+-.+\/code/.test(window.location.pathname);
    }

    function isMarkdownPage() {
        const path = window.location.pathname;
        const markdownSegments = ['/new', '/edit', '/feedback', '/discussions'];
        if (path.includes('/sets/')) return false;
        return markdownSegments.some(segment => path.includes(segment));
    }

    function normalizeScriptPath(pathname) {
        let withoutLocale = pathname.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?\//, '/');
        const match = withoutLocale.match(/^\/scripts\/\d+-.+?(?=\/|$)/);
        return match ? match[0] : null;
    }

    function extractScriptIdFromNormalizedPath(normalized) {
        const match = normalized.match(/\/scripts\/(\d+)-/);
        return match ? match[1] : null;
    }

    async function saveCache() {
        await GM_setValue(CACHE_KEY, iconCache);
    }

    // #endregion

    // ================
    // #region UI ENHANCEMENTS
    // ================

    function addAdditionalInfoSeparator() {
        const additionalInfo = document.getElementById('additional-info');
        if (additionalInfo && !additionalInfo.previousElementSibling?.matches('hr.bgs-info-separator')) {
            const hr = document.createElement('hr');
            hr.className = 'bgs-info-separator';
            additionalInfo.before(hr);
        }
    }

    function highlightScriptDescription() {
        const descriptionElements = document.querySelectorAll('#script-description, .script-description.description');
        descriptionElements.forEach(element => {
            const scriptLink = element.closest('article, li')?.querySelector('a.script-link');
            const path = scriptLink ? normalizeScriptPath(new URL(scriptLink.href).pathname) : normalizeScriptPath(window.location.pathname);
            if (element && element.parentElement.tagName !== 'BLOCKQUOTE') {
                const blockquoteWrapper = document.createElement('blockquote');
                blockquoteWrapper.className = 'script-description-blockquote';
                if (path) blockquoteWrapper.dataset.bgfPath = path;
                element.parentNode.insertBefore(blockquoteWrapper, element);
                blockquoteWrapper.appendChild(element);
            }
        });
    }

    function makeDiscussionClickable() {
        document.querySelectorAll('.discussion-list-container').forEach(container => {
            container.addEventListener('click', function(e) {
                if (e.target.tagName === 'A' || e.target.closest('a') || 
                    e.target.closest('.user-link') || e.target.closest('.badge-author') || 
                    e.target.closest('.rating-icon')) return;
                
                const discussionLink = this.querySelector('.discussion-title');
                if (discussionLink?.href) window.location.href = discussionLink.href;
            });
        });
    }

    function applySyntaxHighlighting() {
        document.querySelectorAll('pre code').forEach(block => {
            if (block.dataset.highlighted === 'true') return;
            const code = block.textContent;
            block.innerHTML = highlight(code);
            block.dataset.highlighted = 'true';
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function highlight(code) {
        const keywords = new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in', 'async', 'await', 'try', 'catch', 'new', 'import', 'export', 'from', 'class', 'extends', 'super', 'true', 'false', 'null', 'undefined', 'document', 'window']);
        const tokens = [];
        let cursor = 0;

        const tokenDefinitions = [
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

        let processedCode = escapeHtml(code);
        while (cursor < processedCode.length) {
            let matched = false;
            for (const def of tokenDefinitions) {
                const match = def.regex.exec(processedCode.slice(cursor));
                if (match) {
                    const content = match[0];
                    if (def.type === 'function' && keywords.has(content)) continue;
                    tokens.push({ type: def.type, content });
                    cursor += content.length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                tokens.push({ type: 'unknown', content: processedCode[cursor] });
                cursor++;
            }
        }

        return tokens.map(token => {
            if (['whitespace', 'unknown', 'url'].includes(token.type)) return token.content;
            if (token.type === 'property') return `<span class="sh-punctuation">.</span><span class="sh-property">${token.content.slice(1)}</span>`;
            return `<span class="sh-${token.type}">${token.content}</span>`;
        }).join('');
    }

    // #endregion

    // ================
    // #region ICON SYSTEM
    // ================

    function createIconElement(src, isHeader = false) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.cssText = isHeader ? 
            'width:80px;height:80px;margin-right:10px;vertical-align:middle;border-radius:4px;object-fit:contain;pointer-events:none;' :
            'width:40px;height:40px;margin-right:8px;vertical-align:middle;border-radius:3px;object-fit:contain;pointer-events:none;';
        img.loading = 'lazy';
        return img;
    }

    function extractMetadataFromContent(content) {
        if (typeof content !== 'string') return {};
        const metadata = {};
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('// ==/UserScript==')) break;
            if (!trimmedLine.startsWith('// @')) continue;
            
            const match = trimmedLine.match(/\/\/\s*(@icon)\s+(.+)/);
            if (match) {
                metadata['@icon'] = match[2].trim();
                break;
            }
        }
        return metadata;
    }

    async function processScript(normalizedPath, targetElement, isHeader = false) {
        if (processedKeys.has(normalizedPath)) {
            const cached = iconCache[normalizedPath];
            if (cached?.iconUrl) {
                targetElement.prepend(createIconElement(cached.iconUrl, isHeader));
            }
            return;
        }
        
        processedKeys.add(normalizedPath);
        const cached = iconCache[normalizedPath];
        const now = Date.now();
        
        if (cached && now - cached.ts < 7 * 24 * 60 * 60 * 1000) {
            if (cached.iconUrl) {
                targetElement.prepend(createIconElement(cached.iconUrl, isHeader));
            }
            return;
        }
        
        const scriptId = extractScriptIdFromNormalizedPath(normalizedPath);
        if (!scriptId) {
            iconCache[normalizedPath] = { ts: now };
            await saveCache();
            return;
        }
        
        const scriptUrl = `https://update.greasyfork.org/scripts/${scriptId}.js`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: scriptUrl,
            timeout: 6000,
            onload: async function(res) {
                if (typeof res.responseText !== 'string') {
                    iconCache[normalizedPath] = { ts: now };
                    await saveCache();
                    return;
                }
                
                const rawMetadata = extractMetadataFromContent(res.responseText);
                const metadata = {
                    iconUrl: rawMetadata['@icon'] || null,
                    ts: now
                };
                
                iconCache[normalizedPath] = metadata;
                await saveCache();
                
                if (metadata.iconUrl) {
                    targetElement.prepend(createIconElement(metadata.iconUrl, isHeader));
                }
            },
            onerror: async function() {
                iconCache[normalizedPath] = { ts: now };
                await saveCache();
            }
        });
    }

    function processIconElements() {
        document.querySelectorAll('a.script-link:not([data-icon-processed])')
            .forEach(el => {
                el.setAttribute('data-icon-processed', '1');
                const href = el.getAttribute('href');
                if (!href || !href.startsWith('/')) return;
                
                try {
                    const url = new URL(href, window.location.origin);
                    const normalized = normalizeScriptPath(url.pathname);
                    if (normalized) {
                        setTimeout(() => processScript(normalized, el, false), 0);
                    }
                } catch(e) {}
            });
        
        const headers = document.querySelectorAll('header');
        for (const header of headers) {
            const h2 = header.querySelector('h2');
            const desc = header.querySelector('p.script-description');
            if (h2 && desc && !h2._handled) {
                h2._handled = true;
                const normalized = normalizeScriptPath(window.location.pathname);
                if (normalized) {
                    setTimeout(() => processScript(normalized, h2, true), 0);
                }
                break;
            }
        }
    }

    // #endregion

    // ================
    // #region HTML EDITOR
    // ================

    function insertText(textarea, prefix, suffix = '', placeholder = '') {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const text = selected || placeholder;
        
        if (!selected && !placeholder) {
            textarea.setRangeText(prefix + suffix, start, end);
            const cursorPosition = start + prefix.length;
            textarea.setSelectionRange(cursorPosition, cursorPosition);
        } else {
            textarea.setRangeText(prefix + text + suffix, start, end, selected ? 'end' : 'select');
        }
        textarea.focus();
    }

    function createToolbarButton(def) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'txt-editor-toolbar-button';
        btn.dataset.tooltip = def.title;
        btn.innerHTML = def.icon || def.label;
        btn.addEventListener('click', e => {
            e.preventDefault();
            def.action();
        });
        return btn;
    }

    function showCustomPrompt({ inputs, onConfirm }) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-prompt-overlay';
        const modal = document.createElement('div');
        modal.className = 'custom-prompt-box';
        
        const editorContainer = document.querySelector('.txt-editor-container');
        modal.classList.add(editorContainer?.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme');
        
        const form = document.createElement('form');
        const inputsMap = new Map();
        
        inputs.forEach(config => {
            const label = document.createElement('label');
            label.textContent = config.label;
            let field;
            
            if (config.type === 'select') {
                field = document.createElement('select');
                (config.options || []).forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    if (config.value && opt.value === config.value) option.selected = true;
                    field.appendChild(option);
                });
            } else {
                field = document.createElement('input');
                field.type = config.type || 'text';
                field.placeholder = config.placeholder || '';
                field.value = config.value || '';
                field.required = config.required !== false;
                if (config.type === 'number') field.min = '1';
            }
            
            label.appendChild(field);
            form.appendChild(label);
            inputsMap.set(config.id, field);
        });
        
        const buttons = document.createElement('div');
        buttons.className = 'custom-prompt-buttons';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'submit';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.className = 'custom-prompt-confirm';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'custom-prompt-cancel';
        cancelBtn.onclick = () => document.body.removeChild(overlay);
        
        form.onsubmit = (e) => {
            e.preventDefault();
            const results = {};
            for (const [id, inputElement] of inputsMap.entries()) {
                results[id] = inputElement.value;
            }
            onConfirm(results);
            document.body.removeChild(overlay);
        };
        
        buttons.append(confirmBtn, cancelBtn);
        form.appendChild(buttons);
        modal.appendChild(form);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        inputsMap.values().next().value.focus();
    }

    async function createTextStyleEditor(textarea) {
        if (textarea.dataset.editorApplied) return;
        textarea.dataset.editorApplied = 'true';
        
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.setRangeText('   ', this.selectionStart, this.selectionEnd, 'end');
            }
            if (e.shiftKey && e.key === 'Enter') {
                e.preventDefault();
                this.setRangeText('\n<br>\n', this.selectionStart, this.selectionEnd, 'end');
            }
        });
        
        const container = document.createElement('div');
        container.className = 'txt-editor-container';
        const toolbar = document.createElement('div');
        toolbar.className = 'txt-editor-toolbar';
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        function applyTheme(isDark) {
            container.classList.toggle('dark-theme', isDark);
            container.classList.toggle('light-theme', !isDark);
        }
        applyTheme(mediaQuery.matches);
        mediaQuery.addEventListener('change', e => applyTheme(e.matches));
        
        const tools = [
            { title: 'Bold', icon: icons.bold, action: () => insertText(textarea, '<strong>', '</strong>', 'bold text') },
            { title: 'Italic', icon: icons.italic, action: () => insertText(textarea, '<em>', '</em>', 'italic text') },
            { title: 'Link', icon: icons.link, action: () => {
                const url = prompt('Enter URL:');
                if (url) insertText(textarea, `<a href="${url}">`, '</a>', 'link text');
            }},
            { title: 'Code', icon: icons.code, action: () => insertText(textarea, '<code>', '</code>', 'code') },
            { title: 'Quote', icon: icons.quote, action: () => insertText(textarea, '\n<blockquote>\n  ', '\n</blockquote>\n', 'quote') },
            { type: 'color-picker' }
        ];
        
        for (const tool of tools) {
            if (tool.type === 'color-picker') {
                const colorContainer = document.createElement('div');
                colorContainer.className = 'txt-color-picker-container';
                
                const input = document.createElement('input');
                input.type = 'color';
                input.className = 'txt-color-picker-input';
                const lastColor = await GM_getValue(LAST_COLOR_KEY, '#58a6ff');
                input.value = lastColor;
                
                input.addEventListener('input', async (e) => {
                    await GM_setValue(LAST_COLOR_KEY, e.target.value);
                });
                
                const colorBtn = createToolbarButton({
                    title: 'Text Color',
                    label: icons.text_color,
                    action: () => insertText(textarea, `<span style="color: ${input.value};">`, '</span>', 'colored text')
                });
                
                colorContainer.appendChild(input);
                colorContainer.appendChild(colorBtn);
                toolbar.appendChild(colorContainer);
            } else {
                toolbar.appendChild(createToolbarButton(tool));
            }
        }
        
        textarea.parentNode.insertBefore(container, textarea);
        container.append(toolbar, textarea);
    }

    function applyToAllTextareas() {
        const textareas = document.querySelectorAll('textarea:not(#script_version_code):not([data-editor-applied])');
        textareas.forEach(createTextStyleEditor);
    }

    // #endregion

    // ================
    // #region DOWNLOAD BUTTON
    // ================

    function initializeDownloadButton() {
        const waitFor = (sel) => new Promise((resolve) => {
            const el = document.querySelector(sel);
            if (el) return resolve(el);
            const obs = new MutationObserver(() => {
                const el = document.querySelector(sel);
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(document, { childList: true, subtree: true });
        });

        waitFor('label[for="wrap-lines"]').then((label) => {
            const wrapLinesCheckbox = document.getElementById('wrap-lines');
            if (wrapLinesCheckbox) wrapLinesCheckbox.checked = false;
            
            const toolbar = label.parentElement;
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = 'Download';
            btn.style.cssText = 'margin-left:12px;background-color:#005200;color:white;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;';
            
            btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#1e971e');
            btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#005200');
            
            btn.addEventListener('click', () => {
                const normalizedPath = normalizeScriptPath(window.location.pathname);
                const scriptId = extractScriptIdFromNormalizedPath(normalizedPath);
                
                if (!scriptId) {
                    alert('Could not identify script ID');
                    return;
                }
                
                const scriptUrl = `https://update.greasyfork.org/scripts/${scriptId}.js`;
                btn.disabled = true;
                btn.textContent = 'Downloading...';
                
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: scriptUrl,
                    onload: function(res) {
                        const code = res.responseText;
                        if (!code) {
                            alert('Code not found');
                            return;
                        }
                        
                        const nameMatch = code.match(/\/\/\s*@name\s+(.+)/i);
                        const fileName = nameMatch ? `${nameMatch[1].trim()}.user.js` : 'script.user.js';
                        
                        const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    },
                    onerror: () => alert('Download error'),
                    ontimeout: () => alert('Download timeout'),
                    onloadend: () => {
                        btn.disabled = false;
                        btn.textContent = 'Download';
                    }
                });
            });
            
            toolbar.appendChild(btn);
        });
    }

    // #endregion

    // ================
    // #region INITIALIZE
    // ================

    async function start() {
        iconCache = await GM_getValue(CACHE_KEY, {});
        
        if (isMarkdownPage()) {
            applyToAllTextareas();
        }
        
        if (isCodePage()) {
            initializeDownloadButton();
        }
        
        processIconElements();
        highlightScriptDescription();
        
        if (isScriptPage()) {
            addAdditionalInfoSeparator();
        }
        
        makeDiscussionClickable();
        applySyntaxHighlighting();
        
        const observer = new MutationObserver(() => {
            processIconElements();
            highlightScriptDescription();
            if (isScriptPage()) addAdditionalInfoSeparator();
            if (isMarkdownPage()) applyToAllTextareas();
            makeDiscussionClickable();
            applySyntaxHighlighting();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    start();
    
    // #endregion
})();