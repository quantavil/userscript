import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../dist/better-rule34.user.js', import.meta.url), 'utf8');
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
const CONSOLE_KEY = 'better_rule34_console_v2';
const WATCH_KEY = 'better_rule34_watch_v2';

// Card markup. The thumbnail <img> deliberately has no class: the real site may not use one.
function card(id, { rating = 90, views = '5K', preview = `https://rule34video.com/get_file/1/x/${id}_preview.mp4/` } = {}) {
  return `<div class="item thumb" data-video-card-id="${id}">
    <a class="th js-open-popup" href="https://rule34video.com/video/${id}/slug-${id}/" title="Video ${id}">
      <div class="img wrap_image"${preview ? ` data-preview="${preview}"` : ''}>
        <img src="https://rule34video.com/contents/${id}.jpg" alt="">
        <div class="time">1:00</div><svg class="custom-svg custom-play"></svg>
      </div>
      <div class="thumb_title">Video ${id}</div>
      <div class="thumb_info video-card-meta">
        <div class="rating video-card-meta__rating">${rating}% (20)</div>
        <div class="views video-views-count">${views}</div>
      </div>
    </a></div>`;
}
const AD = `<div class="item thumb"><header>AD</header><a class="th" href="https://s.ku34bh9la09.com/v1/d.php?z=2644"><div class="img wrap_image"><iframe src="https://engine.sadbaguette.com/?1"></iframe></div></a></div>`;

// The ALL FILTERS sheet, as in the pasted markup.
const SHEET_BODY = `
  <div class="fs-sec" data-sec="tags"><div class="fs-sec__h"><h3>Tags</h3></div></div>
  <div class="fs-sec" data-sec="date"><div class="fs-sec__h"><h3>Date added</h3></div>
    <div class="fs-opts">
      <button type="button" class="fs-opt radio is-on" aria-pressed="true" data-set="date|">Any time</button>
      <button type="button" class="fs-opt radio" aria-pressed="false" data-set="date|1">Past 24 hours</button>
    </div></div>
  <div class="fs-sec" data-sec="dur"><div class="fs-sec__h"><h3>Duration</h3></div>
    <div class="fs-opts"><button type="button" class="fs-opt radio is-on" aria-pressed="true" data-set="dur|">Any</button></div></div>`;
const SHEET = `<div class="fs-sheet"><div class="fs-sheet__head"><h2>Filters</h2></div>
  <div class="fs-sheet__body">${SHEET_BODY}</div>
  <div class="fs-sheet__foot"><button type="button" class="fs-ghost" data-act="reset">Clear all</button><button type="button" class="fs-apply" data-act="apply">Show 82,402 videos</button></div></div>`;

const listing = (cards, { sheet = true } = {}) =>
  `<!doctype html><html><body>${sheet ? SHEET : ''}<div class="content_general"><div class="thumbs clearfix" id="custom_list_videos_most_recent_videos_items">${cards}</div></div></body></html>`;

const watchPage = ({ actions = true } = {}) =>
  `<!doctype html><html><body><div class="vp-panel">${
    actions
      ? '<div class="vp-actions"><a class="vp-btn vp-playlist" href="#">Playlist</a><button type="button" class="vp-btn js-vp-sheet" data-sheet="download">Download</button><button type="button" class="vp-btn js-vp-sheet" data-sheet="more">More</button></div>'
      : ''
  }</div></body></html>`;

const defaultFetch = async () => ({ ok: true, text: async () => listing('') });

async function makeWindow(html, { seed, url = 'https://rule34video.com/latest-updates/', fetchImpl } = {}) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const observers = [];
  class FakeIO {
    constructor(cb) { this.cb = cb; this.targets = new Set(); observers.push(this); }
    observe(t) { this.targets.add(t); }
    unobserve(t) { this.targets.delete(t); }
    disconnect() { this.targets.clear(); }
  }
  window.IntersectionObserver = FakeIO;
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function () {};
  window.HTMLMediaElement.prototype.load = function () {};
  const opened = [];
  window.open = (...a) => { opened.push(a); return null; };
  window.fetch = fetchImpl ?? defaultFetch;
  if (seed) for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
  window.eval(script);
  await tick(60);
  /** Reports every observed preview card as visible at `ratio`. */
  const showAll = (ratio = 1) => {
    const io = observers.find((o) => [...o.targets].some((t) => t.classList?.contains('wrap_image')));
    io?.cb([...io.targets].map((target) => ({ target, intersectionRatio: ratio })));
  };
  return { window, document: window.document, opened, showAll };
}

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(cond ? 'PASS' : 'FAIL', name, extra);
  if (!cond) failures++;
};
const $ = (scope, sel) => scope.querySelector(sel);
const $$ = (scope, sel) => [...scope.querySelectorAll(sel)];
const hiddenCount = (doc) => $$(doc, '.item.thumb[data-br34-hidden="true"]').length;
const cssRules = (doc) => [...doc.styleSheets].flatMap((s) => [...s.cssRules]);

function fakeVideo(doc, src) {
  const v = doc.createElement('video');
  const state = { t: 0 };
  Object.defineProperty(v, 'currentSrc', { value: src, configurable: true });
  Object.defineProperty(v, 'duration', { value: 100, configurable: true });
  Object.defineProperty(v, 'currentTime', { get: () => state.t, configurable: true });
  Object.defineProperty(v, 'paused', { get: () => false, configurable: true });
  doc.body.append(v);
  return { v, state };
}

// ---- A: controls live in the ALL FILTERS sheet; marking works ----
{
  const A = await makeWindow(listing(`${AD}${card(101)}${card(102)}${card(103, { preview: null })}`));
  const doc = A.document;
  check('ad card removed', $$(doc, '.item.thumb').length === 3);
  check('no floating console or panel', !$(doc, '.br34-fab, .br34-panel'));
  check('no rating/views block in the chip strip (no .filters-panel injection)', !$(doc, '.filters-panel .br34-root'));
  const body = $(doc, '.fs-sheet__body');
  const root = $(body, '.br34-root');
  check('controls are the last part of the ALL FILTERS sheet body', !!root && root.parentElement === body && body.lastElementChild === root);
  check('nine rating pills and ten views pills', $$(root, '[data-br34-kind="rating"]').length === 9 && $$(root, '[data-br34-kind="views"]').length === 10);
  check('our pills do not carry the site data-set attribute', !$(root, '[data-set]'));
  check('no sound or autoplay controls', !/sound|autoplay/i.test(root.textContent));
  check('Any is selected by default', $(root, '[data-br34-kind="rating"][data-br34-value="0"]').getAttribute('aria-pressed') === 'true');
  check('count line starts correct', $(root, '.br34-count').textContent === '3 of 3 loaded videos shown');
  check('one mark button per card', $$(doc, '.br34-mark').length === 3);

  const [c1, c2] = $$(doc, '.item.thumb');
  c1.querySelector('.br34-mark').click();
  const watch = JSON.parse(A.window.localStorage.getItem(WATCH_KEY) || '{}');
  check('mark stores a manual watch', watch['101']?.manual === true);
  check('marked card is greyed', c1.classList.contains('br34-watched'));
  check('mark text updates to WATCHED', c1.querySelector('.br34-mark').textContent.includes('WATCHED'));
  check('mark click does not open the video', A.opened.length === 0);
  c2.querySelector('.thumb_title').click();
  check('plain title click still opens a new tab', A.opened.length === 1 && String(A.opened[0][0]).includes('/video/102/'));

  const rules = cssRules(doc);
  check('watched greying is a layer over the whole thumbnail', rules.some((r) => r.selectorText?.includes('.br34-watched') && r.selectorText.includes('::after')));
  check('mark button is never hidden by opacity', !rules.some((r) => r.selectorText?.includes('.br34-mark') && r.style?.opacity === '0'));

  const S = await makeWindow(listing(card(201) + card(202)), { seed: { [WATCH_KEY]: JSON.stringify({ 202: { at: 1, manual: true } }) } });
  const sCards = $$(S.document, '.item.thumb');
  check('cards watched earlier load already greyed', sCards[1].classList.contains('br34-watched') && !sCards[0].classList.contains('br34-watched'));
}

// ---- B: pills in the sheet filter live, and stay out of the site's way ----
{
  const B = await makeWindow(listing(card(301, { rating: 91, views: '12K' }) + card(302, { rating: 85, views: '4K' }) + card(303, { rating: 70, views: '20K' })));
  const doc = B.document;
  const root = $(doc, '.br34-root');
  const siteClicks = [];
  $(doc, '.fs-sheet__body').addEventListener('click', () => siteClicks.push(1));

  $(root, '[data-br34-kind="rating"][data-br34-value="80"]').click();
  check('80%+ hides the 70% card', hiddenCount(doc) === 1 && $$(doc, '.item.thumb')[2].dataset.br34Hidden === 'true');
  check('count reflects the filter', $(root, '.br34-count').textContent === '2 of 3 loaded videos shown');
  check('selection moves to 80%+', $(root, '[data-br34-kind="rating"][data-br34-value="80"]').classList.contains('is-on') && !$(root, '[data-br34-kind="rating"][data-br34-value="0"]').classList.contains('is-on'));
  check('output shows the choice', $(root, '[data-out="rating"]').textContent === '80%+');
  check('the site sheet handler never sees our pill clicks', siteClicks.length === 0, `seen=${siteClicks.length}`);

  $(root, '[data-br34-kind="views"][data-br34-value="5000"]').click();
  check('5K+ also hides the 4K card', hiddenCount(doc) === 2);
  check('choice is saved in this browser', JSON.parse(B.window.localStorage.getItem(CONSOLE_KEY)).minViews === 5000);

  $(doc, '.fs-sheet__foot [data-act="reset"]').click();
  check('Clear all resets min rating and views', hiddenCount(doc) === 0 && $(root, '[data-out="rating"]').textContent === 'Any' && $(root, '[data-out="views"]').textContent === 'Any');

  $(root, '[data-br34-kind="rating"][data-br34-value="90"]').click();
  $(doc, '.fs-sheet__body').innerHTML = SHEET_BODY;
  await tick(80);
  const again = $(doc, '.fs-sheet__body .br34-root');
  check('controls come back after the site re-renders the sheet, with the same choice', !!again && $(again, '[data-out="rating"]').textContent === '90%+');
  check('no duplicate controls', $$(doc, '.br34-root').length === 1);
}

// ---- C: saved choices snap; unreadable values never hide a card ----
{
  const C = await makeWindow(listing(card(401, { rating: 'x', views: '' }) + card(402, { rating: 40 })), {
    seed: { [CONSOLE_KEY]: JSON.stringify({ minRating: 78, minViews: 4000, soundOnly: true, autoplay: false }) },
  });
  const root = $(C.document, '.br34-root');
  check('saved values snap to the nearest choice', $(root, '[data-out="rating"]').textContent === '80%+' && $(root, '[data-out="views"]').textContent === '5K+');
  check('card with unreadable rating and views stays visible', $$(C.document, '.item.thumb')[0].dataset.br34Hidden === 'false');
  check('card rated 40 is hidden by 80%+', $$(C.document, '.item.thumb')[1].dataset.br34Hidden === 'true');
}

// ---- D: the site swaps the list without any click we can see ----
{
  const fetches = [];
  const fetchImpl = async (url) => { fetches.push(url); return { ok: true, text: async () => listing(card(900)) }; };
  const D = await makeWindow(listing(card(501) + card(502)), { fetchImpl });
  const container = $(D.document, '#custom_list_videos_most_recent_videos_items');
  container.innerHTML = card(601) + card(602) + card(603);
  await tick(250);
  check('a list the site swapped in is picked up and marked', $$(D.document, '.br34-mark').length === 3 && $$(D.document, '.item.thumb').length === 3);
  D.window.dispatchEvent(new D.window.Event('scroll'));
  await tick(150);
  check('pages continue from the new list (2, then 3), not the old one', fetches[0]?.includes('/latest-updates/2/') && fetches[1]?.includes('/latest-updates/3/'), fetches.join(' '));
}

// ---- E: autoplay ----
{
  const E = await makeWindow(listing(card(101) + card(102) + card(103) + card(104) + card(105) + card(106) + card(107) + card(108) + card(109, { preview: null })));
  const doc = E.document;
  const cards = $$(doc, '.item.thumb');
  cards[0].querySelector('.br34-mark').click();
  E.showAll(0.9);
  check('every eligible visible card plays (no cap of 4)', $$(doc, 'video.br34-autoplay-video').length === 7, `playing=${$$(doc, 'video.br34-autoplay-video').length}`);
  check('watched card does not play', !cards[0].querySelector('video'));
  const wrap = cards[1].querySelector('.wrap_image');
  check('clip stays hidden until a frame plays', !wrap.classList.contains('br34-playing'));
  wrap.querySelector('video').dispatchEvent(new E.window.Event('playing'));
  check('clip shows once it plays', wrap.classList.contains('br34-playing'));
  check('previews are muted', $$(doc, 'video.br34-autoplay-video').every((v) => v.muted));
  const lazy = cards[8].querySelector('.wrap_image');
  check('a card without a preview url does not play yet', !lazy.querySelector('video'));
  lazy.dataset.preview = 'https://rule34video.com/get_file/1/x/109_preview.mp4/';
  E.showAll(0.9);
  check('a preview url that appears later is picked up', !!lazy.querySelector('video'));
}

// ---- F: failing clips are retried; a clip that plays again resets the count ----
{
  const F = await makeWindow(listing(card(701)));
  F.showAll(0.9);
  const wrapOf = () => F.document.querySelector('.item.thumb .wrap_image');
  const vid = () => wrapOf().querySelector('video');
  const fail = () => vid().dispatchEvent(new F.window.Event('error'));
  fail();
  check('failed clip is removed, not left as a black box', !vid());
  await tick(1600);
  check('first failure is retried', !!vid());
  vid().dispatchEvent(new F.window.Event('playing'));
  fail();
  await tick(1600);
  check('after a clip plays again, a new failure is retried', !!vid());
  fail();
  await tick(3100);
  check('second failure in a row is retried after a longer wait', !!vid());
  fail();
  await tick(4600);
  check('gives up after three failures in a row', !vid());
}

// ---- G: auto next page ----
{
  let fetches = 0;
  const pages = { 2: card(201) + card(202), 3: card(201) + card(202) };
  const fetchImpl = async (url) => {
    fetches++;
    const n = Number(/latest-updates\/(\d+)\//.exec(url)?.[1]);
    return { ok: true, text: async () => listing(pages[n] ?? '') };
  };
  const G = await makeWindow(listing(card(1) + card(2)), { fetchImpl });
  const scroll = async () => { G.window.dispatchEvent(new G.window.Event('scroll')); await tick(120); };
  await scroll();
  check('page 2 appended with a separator', $$(G.document, '.item.thumb').length === 4 && !!$(G.document, '.br34-page-sep'));
  check('appended cards get a mark button', $$(G.document, '.br34-mark').length === 4);
  await scroll(); await scroll(); await scroll();
  check('a repeated page ends the list', fetches === 2, `fetches=${fetches}`);
  check('end of list is shown', /END OF LIST/.test($(G.document, '.br34-autopager-container').textContent));
}

// ---- H: a filter that hides everything keeps loading, then waits for a scroll ----
{
  let fetches = 0;
  let nextId = 300;
  const fetchImpl = async () => {
    fetches++;
    const cards = card(nextId++, { rating: 50 }) + card(nextId++, { rating: 50 });
    return { ok: true, text: async () => listing(cards) };
  };
  const H = await makeWindow(listing(card(1, { rating: 50 }) + card(2, { rating: 50 })), { fetchImpl });
  $(H.document, '.br34-root [data-br34-kind="rating"][data-br34-value="95"]').click();
  await tick(400);
  check('empty filtered pages auto-load three times, then wait', fetches === 3, `fetches=${fetches}`);
  H.window.dispatchEvent(new H.window.Event('scroll'));
  await tick(150);
  check('scrolling resumes loading', fetches === 4, `fetches=${fetches}`);
}

// ---- I: video page: Mark watched in the action row; 85% tracking ----
{
  const I = await makeWindow(watchPage(), { url: 'https://rule34video.com/video/4655018/capella-re-zero/' });
  const doc = I.document;
  const btn = $(doc, '.vp-actions .br34-watch-btn');
  const more = $(doc, '.vp-actions [data-sheet="more"]');
  check('Mark watched sits in the action row, right before More', !!btn && btn.nextElementSibling === more);
  check('no floating dock when the action row exists', !$(doc, '.br34-dock'));
  check('starts unwatched', btn.getAttribute('aria-pressed') === 'false' && btn.textContent.includes('Mark watched'));
  btn.click();
  check('click marks the video by hand', JSON.parse(I.window.localStorage.getItem(WATCH_KEY))['4655018']?.manual === true);
  check('button reflects watched', btn.getAttribute('aria-pressed') === 'true' && btn.textContent.includes('Watched'));
  btn.click();
  check('second click unmarks', !JSON.parse(I.window.localStorage.getItem(WATCH_KEY) || '{}')['4655018']);

  const { v, state } = fakeVideo(doc, 'https://rule34video.com/get_file/51/abc/4655000/4655018/4655018.mp4');
  await tick(30);
  v.dispatchEvent(new I.window.Event('loadedmetadata'));
  for (state.t = 0; state.t <= 90; state.t++) v.dispatchEvent(new I.window.Event('timeupdate'));
  const w = JSON.parse(I.window.localStorage.getItem(WATCH_KEY) || '{}');
  check('85% of playback marks the video', w['4655018']?.manual === false);
  check('the button follows the new state', btn.getAttribute('aria-pressed') === 'true');

  const M = await makeWindow(watchPage(), {
    url: 'https://rule34video.com/video/4655018/capella-re-zero/',
    seed: { [WATCH_KEY]: JSON.stringify({ 4655018: { at: 1, manual: true } }) },
  });
  const m = fakeVideo(M.document, 'https://rule34video.com/get_file/51/abc/4655000/4655018/4655018.mp4');
  await tick(30);
  m.v.dispatchEvent(new M.window.Event('loadedmetadata'));
  for (m.state.t = 0; m.state.t <= 90; m.state.t++) m.v.dispatchEvent(new M.window.Event('timeupdate'));
  const mw = JSON.parse(M.window.localStorage.getItem(WATCH_KEY));
  check('a manual mark stays manual and keeps its date', mw['4655018'].manual === true && mw['4655018'].at === 1);
}

// ---- J: video page without an action row gets a floating button ----
{
  const J = await makeWindow(watchPage({ actions: false }), { url: 'https://rule34video.com/video/777/x/' });
  check('without an action row, a floating button is used', !!$(J.document, '.br34-dock .br34-watch-btn'));
}

// ---- K: a listing without the ALL FILTERS sheet still works ----
{
  const K = await makeWindow(listing(card(801) + card(802), { sheet: false }));
  check('cards still get marks and no controls are injected', $$(K.document, '.br34-mark').length === 2 && !$(K.document, '.br34-root'));
  $(K.document, '.br34-mark').click();
  check('marking still works without the sheet', $$(K.document, '.br34-watched').length === 1);
}

console.log(failures === 0 ? '\nALL SMOKE CHECKS PASSED' : `\n${failures} SMOKE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
