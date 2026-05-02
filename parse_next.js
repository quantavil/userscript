const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const container = document.querySelector('.tp-test-area, .test-interface, .que-ans-box')?.parentElement || document;
console.log("Container found:", !!document.querySelector('.tp-test-area, .test-interface, .que-ans-box'));
if (document.querySelector('.tp-test-area, .test-interface, .que-ans-box')) {
  console.log("Container classes:", document.querySelector('.tp-test-area, .test-interface, .que-ans-box').parentElement.className);
}

const els = Array.from(container.querySelectorAll('button, a, div[role="button"]'));
console.log("Found interactive elements:", els.length);
for (const el of els) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (txt === 'next' || txt === 'save & next') {
        console.log("Matched by text:", el.outerHTML.substring(0, 100));
    }
    if (el.querySelector('.fa-chevron-right') || el.querySelector('.fa-angle-right')) {
        console.log("Matched by icon:", el.outerHTML.substring(0, 100));
    }
}
const fallback = container.querySelector('.next-btn, .btn-next, [ng-click*="nextQuestion"]');
if (fallback) {
    console.log("Matched by fallback:", fallback.outerHTML.substring(0, 100));
}

