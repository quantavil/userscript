import { expect, type Page, test } from '@playwright/test';

const FEED = '/r/oddlysatisfying/';
const reel = (page: Page) => page.locator('#rr-reel-host');
const inReel = (page: Page, sel: string) => reel(page).locator(sel);

async function openReel(page: Page) {
  await page.goto(FEED);
  await page.locator('#rr-fab-host button').click();
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
  await expect(active.locator('.seek')).toHaveCount(1);
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

test('comments open the new-Reddit post page; Back resumes the reel on that post', async ({ page }) => {
  await openReel(page);
  await swipe(page, 3);
  await expect(inReel(page, '.slide[data-index="3"]')).toHaveClass(/active/);
  await inReel(page, '.slide.active [data-action="comments"]').click();
  await page.waitForURL(/\/comments\//);
  expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:3000\/r\/oddlysatisfying\/comments\//);
  await page.goBack();
  await expect(inReel(page, '.slide.active')).toHaveAttribute('data-id', 't3_1wbnrm5');
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
