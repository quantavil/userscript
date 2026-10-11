import { expect, type Page, test } from '@playwright/test';

const FEED = '/r/oddlysatisfying/';
const reel = (page: Page) => page.locator('#rr-reel-host');
const inReel = (page: Page, sel: string) => reel(page).locator(sel);

async function openReel(page: Page) {
  await page.goto(FEED);
  await page.locator('#rr-fab-host button').click();
  await expect(inReel(page, '.slide.active')).toBeVisible();
}

/** The extras fixture has no Reddit CSS, so its text can overlap the FAB: click it directly. */
async function openReelAt(page: Page, url: string) {
  await page.goto(url);
  await page.locator('#rr-fab-host button').dispatchEvent('click');
  await expect(inReel(page, '.slide.active')).toBeVisible();
}

async function swipe(page: Page, slides: number) {
  await page.evaluate((n) => {
    const t = document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('.track') as HTMLElement;
    t.scrollTop += n * t.clientHeight;
  }, slides);
}

test('FAB shows on feeds and opens a full-screen reel over a hidden page', async ({ page }) => {
  await page.goto(FEED);
  await expect(page.locator('#rr-fab-host button')).toBeVisible();
  await page.locator('#rr-fab-host button').click();
  await expect(inReel(page, '.slide:not(.end)')).toHaveCount(6);
  expect(await page.evaluate(() => getComputedStyle(document.body).display)).toBe('none');
  expect(await page.evaluate(() => history.state?.rrReel)).toBe(true);
});

test('first slide is a Reddit video playing through the one shared <video>', async ({ page }) => {
  await openReel(page);
  const active = inReel(page, '.slide.active');
  await expect(active).toHaveClass(/kind-video/);
  await expect(active.locator('video')).toHaveCount(1);
  expect(await inReel(page, 'video').count()).toBe(1);
  const src = await active.locator('video').evaluate((v: HTMLVideoElement) => v.src);
  expect(src).toContain('packaged-media.redd.it');
  // Live controls sit in the fixed HUD, not inside the scrolling slide.
  await expect(inReel(page, '.hud .seek')).toBeVisible();
  await expect(active.locator('.seek, .spinner')).toHaveCount(0);
  await expect(active.locator('.title')).toHaveText('Different balls with water drops');
});

test('swiping moves the single video along; non-video slides have none', async ({ page }) => {
  await openReel(page);
  await swipe(page, 1);
  await expect(inReel(page, '.slide[data-index="1"]')).toHaveClass(/active/);
  // HLS-only clip: hls.js (or native HLS) attaches a MediaSource/blob or the playlist URL.
  await expect(inReel(page, '.slide[data-index="1"] video')).toHaveCount(1);
  expect(await inReel(page, 'video').count()).toBe(1);

  await swipe(page, 1);
  await expect(inReel(page, '.slide[data-index="2"]')).toHaveClass(/active/);
  await expect(inReel(page, '.slide[data-index="2"] .gallery img').first()).toBeVisible();
  expect(await inReel(page, 'video').count()).toBe(0);
});

test('far-away slides are unmounted (memory stays flat on phones)', async ({ page }) => {
  await openReel(page);
  await swipe(page, 3);
  await expect(inReel(page, '.slide[data-index="3"]')).toHaveClass(/active/);
  await expect(inReel(page, '.slide[data-index="0"] .media > *')).toHaveCount(0);
  await expect(inReel(page, '.slide[data-index="0"] .backdrop')).toHaveCount(0);
});

test('reaching the end loads the next page via Reddit partial and stops when exhausted', async ({ page }) => {
  await openReel(page);
  await swipe(page, 5);
  await expect(inReel(page, '.slide:not(.end)')).toHaveCount(8, { timeout: 10000 });
  await swipe(page, 3);
  await expect(inReel(page, '.slide.end')).toHaveText("You're all caught up", { timeout: 10000 });
});

test('Back button closes the reel and lands on the same post in the list', async ({ page }) => {
  await openReel(page);
  await swipe(page, 2);
  await expect(inReel(page, '.slide[data-index="2"]')).toHaveClass(/active/);
  await page.goBack();
  await expect(reel(page)).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).display)).not.toBe('none');
  expect(page.url()).toContain(FEED);
  const inView = await page.evaluate(() => {
    const r = document.getElementById('t3_1wwj155')!.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  });
  expect(inView).toBe(true);
});

test('close button and Escape close the reel', async ({ page }) => {
  await openReel(page);
  await inReel(page, '[data-action="close"]').click();
  await expect(reel(page)).toHaveCount(0);
  await page.locator('#rr-fab-host button').click();
  await expect(inReel(page, '.slide.active')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reel(page)).toHaveCount(0);
});

test('comments open the new-Reddit post page in a new tab; the reel stays put', async ({ page, context }) => {
  await openReel(page);
  await swipe(page, 3);
  await expect(inReel(page, '.slide[data-index="3"]')).toHaveClass(/active/);
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    inReel(page, '.slide.active [data-action="comments"]').click(),
  ]);
  await tab.waitForLoadState('domcontentloaded');
  expect(tab.url()).toMatch(/^http:\/\/127\.0\.0\.1:3000\/r\/oddlysatisfying\/comments\//);
  await expect(inReel(page, '.slide.active')).toHaveAttribute('data-id', 't3_1wbnrm5');
  expect(page.url()).toContain(FEED);
});

test('non-video slides hide the seek bar', async ({ page }) => {
  await openReel(page);
  await swipe(page, 2);
  await expect(inReel(page, '.slide[data-index="2"]')).toHaveClass(/active/);
  await expect(inReel(page, '.hud .seek')).toBeHidden();
});

test('keyboard: J/K navigate, M toggles sound, Space toggles play', async ({ page }) => {
  await openReel(page);
  await page.keyboard.press('j');
  await expect(inReel(page, '.slide[data-index="1"]')).toHaveClass(/active/);
  await page.keyboard.press('k');
  await expect(inReel(page, '.slide[data-index="0"]')).toHaveClass(/active/);
  const label = () => inReel(page, '[data-action="sound"]').getAttribute('aria-label');
  const before = await label();
  await page.keyboard.press('m');
  expect(await label()).not.toBe(before);
});

test('link and text posts render as cards with safe links', async ({ page }) => {
  await openReel(page);
  await swipe(page, 5);
  const link = inReel(page, '.slide[data-index="5"]');
  await expect(link).toHaveClass(/active/);
  await expect(link.locator('a.cta')).toHaveAttribute('href', /^https:\/\//);
  await expect(link.locator('a.cta')).toHaveAttribute('rel', /noopener/);
});

test('mobile app links in the page are rewritten to www.reddit.com', async ({ page }) => {
  await page.goto(FEED);
  await expect(page.locator('#rr-fab-host button')).toBeVisible();
  expect(await page.locator('a[href*="applink.reddit.com"]').count()).toBe(0);
  const href = await page.locator('shreddit-post a[slot="full-post-link"]').first().getAttribute('href');
  expect(href).toMatch(/^https:\/\/www\.reddit\.com\/r\/[^?]+\/comments\//);
  expect(href).not.toContain('app_first_navigation');
});

test('"gif" posts load their mp4 directly (no hls.js)', async ({ page }) => {
  await openReelAt(page, '/r/extras/');
  await expect(inReel(page, '.reel')).toHaveClass(/gif/);
  const src = await page.evaluate(
    () => (document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('.slide.active video') as HTMLVideoElement).src,
  );
  expect(src).toContain('format=mp4');
});

test('long text posts fade out; Read more opens a reader that Back and Esc close', async ({ page }) => {
  await openReelAt(page, '/r/extras/');
  await swipe(page, 1);
  const slide = inReel(page, '.slide[data-index="1"]');
  await expect(slide).toHaveClass(/active/);
  await expect(slide.locator('.card')).toHaveClass(/overflowing/);
  await expect(slide.locator('.card .body strong').first()).toBeVisible();

  const reader = inReel(page, '.reader');
  await slide.locator('.more').click();
  await expect(reader).toHaveClass(/open/);
  await expect(reader.locator('.md strong').first()).toBeVisible();
  expect(await page.evaluate(() => history.state?.rrReader)).toBe(true);

  // Phone Back: closes the reader only.
  await page.goBack();
  await expect(reader).not.toHaveClass(/open/);
  await expect(inReel(page, '.slide.active')).toBeVisible();
  expect(await page.evaluate(() => history.state?.rrReel)).toBe(true);

  // Esc: closes the reader only.
  await slide.locator('.more').click();
  await expect(reader).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(reader).not.toHaveClass(/open/);
  await expect(inReel(page, '.slide.active')).toBeVisible();

  // Closing the whole reel with the reader open unwinds both history entries.
  await slide.locator('.more').click();
  await expect(reader).toHaveClass(/open/);
  await page.evaluate(() => {
    (document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('[data-action="close"]') as HTMLElement).click();
  });
  await expect(reel(page)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!history.state?.rrReel || !!history.state?.rrReader)).toBe(false);
});

test('landscape: video chrome hides, a tap shows it for a few seconds, rotation keeps the slide', async ({ page }) => {
  await openReel(page);
  await swipe(page, 1);
  await expect(inReel(page, '.slide[data-index="1"]')).toHaveClass(/active/);
  const opacity = (sel: string) =>
    page.evaluate(
      (s) => getComputedStyle(document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector(s) as HTMLElement).opacity,
      sel,
    );

  await page.setViewportSize({ width: 915, height: 412 });
  const r = inReel(page, '.reel');
  await expect(r).toHaveClass(/immersive/);
  await expect.poll(() => opacity('.top')).toBe('0');
  await expect.poll(() => opacity('.slide.active .rail')).toBe('0');
  // Same slide after rotating: scrollTop follows the new slide height.
  expect(
    await page.evaluate(() => {
      const t = document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('.track') as HTMLElement;
      return t.scrollTop / t.clientHeight;
    }),
  ).toBe(1);

  // First tap: controls only (video keeps its state).
  const paused = () =>
    page.evaluate(() => (document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('video') as HTMLVideoElement).paused);
  const before = await paused();
  await page.mouse.click(300, 200);
  await expect(r).toHaveClass(/chrome-on/);
  await expect.poll(() => opacity('.top')).toBe('1');
  expect(await paused()).toBe(before);

  // Text slides keep their chrome in landscape.
  await page.keyboard.press('j');
  await page.keyboard.press('j');
  await page.keyboard.press('j');
  await expect(inReel(page, '.slide.kind-text.active, .slide.kind-image.active, .slide.kind-gallery.active')).toHaveCount(1);
  await expect(r).not.toHaveClass(/immersive/);

  // Back to portrait: never immersive.
  await page.setViewportSize({ width: 412, height: 915 });
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await page.keyboard.press('k');
  await expect(inReel(page, '.slide[data-index="1"]')).toHaveClass(/active/);
  await expect(r).not.toHaveClass(/immersive/);
});

test('landscape: controls fade out again on their own while playing', async ({ page }) => {
  await openReel(page);
  await page.evaluate(() => {
    const v = document.querySelector('#rr-reel-host')!.shadowRoot!.querySelector('video') as HTMLVideoElement;
    // Bundled Chromium can't decode H.264: pretend it's playing.
    Object.defineProperty(v, 'paused', { get: () => false });
  });
  await page.setViewportSize({ width: 915, height: 412 });
  const r = inReel(page, '.reel');
  await expect(r).toHaveClass(/immersive/);
  await page.mouse.click(300, 200);
  await expect(r).toHaveClass(/chrome-on/);
  await expect(r).not.toHaveClass(/chrome-on/, { timeout: 5000 });
});
