import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

chromium.use(StealthPlugin());

describe('E2E: YouTube Video Filter Userscript (Playwright Stealth)', () => {
  let browser: any;
  let context: any;
  let page: any;
  let userscript: string;

  beforeAll(async () => {
    // Read the compiled userscript bundle
    const userscriptPath = resolve(__dirname, '../dist/youtube-filter.user.js');
    userscript = readFileSync(userscriptPath, 'utf-8');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    page = await context.newPage();

    // Inject userscript into every frame/navigation
    await page.addInitScript({ content: userscript });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('Desktop: mounts peeking tab, adds tags, and applies filters', async () => {
    await page.goto('https://www.youtube.com/results?search_query=javascript+tutorial', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for the peeking toggle tab to be attached
    const toggle = page.locator('#yt-filter-toggle');
    await toggle.waitFor({ state: 'attached', timeout: 10000 });
    expect(await toggle.isVisible()).toBe(true);

    // Verify initial panel is not visible
    const panel = page.locator('#yt-filter-panel');
    const panelLeft = await panel.evaluate((el: HTMLElement) => window.getComputedStyle(el).left);
    expect(parseFloat(panelLeft)).toBeLessThan(0);

    // Click the toggle tab to open the drawer
    await toggle.click();
    await page.waitForTimeout(400);

    // Panel should slide in to left: 0px
    const panelClass = await panel.getAttribute('class');
    expect(panelClass).toContain('visible');

    // Verify Default Profile pill exists
    const defaultPill = page.locator('.ytf-profile-pill:has-text("Default")');
    expect(await defaultPill.count()).toBe(1);

    // Verify tag chip inputs exist
    const tagInputs = page.locator('.ytf-tag-field');
    expect(await tagInputs.count()).toBe(3);

    // Add a keyword tag chip
    const keywordInput = tagInputs.nth(0);
    await keywordInput.fill('tutorial');
    await keywordInput.press('Enter');

    const addedChip = page.locator('.ytf-tag-chip:has-text("tutorial")');
    expect(await addedChip.count()).toBe(1);

    // Verify Hide Shorts and Hide Posts toggle checkboxes exist and can be checked
    const hideShortsCheckbox = page.locator('#ytf-hide-shorts');
    expect(await hideShortsCheckbox.count()).toBe(1);
    await hideShortsCheckbox.check();
    expect(await hideShortsCheckbox.isChecked()).toBe(true);

    const hidePostsCheckbox = page.locator('#ytf-hide-posts');
    expect(await hidePostsCheckbox.count()).toBe(1);
    await hidePostsCheckbox.check();
    expect(await hidePostsCheckbox.isChecked()).toBe(true);

    // Click Apply Filter button
    const applyBtn = page.locator('#ytf-apply');
    await applyBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);

    // Verify apply button and toggle tab state change to active
    const applyClass = await applyBtn.getAttribute('class');
    expect(applyClass).toContain('active');

    // Close panel via Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    const closedPanelClass = await panel.getAttribute('class');
    expect(closedPanelClass).not.toContain('visible');

    // Verify toggle tab is present with active class
    const toggleClass = await toggle.getAttribute('class');
    expect(toggleClass).toContain('active');
  }, 45000);

  it('Mobile Viewport: mounts cleanly and stays within phone viewport', async () => {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 13 / modern phone viewport
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.addInitScript({ content: userscript });

    await mobilePage.goto('https://www.youtube.com/results?search_query=javascript', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const toggle = mobilePage.locator('#yt-filter-toggle');
    await toggle.waitFor({ state: 'attached', timeout: 10000 });
    expect(await toggle.isVisible()).toBe(true);

    // Click to open drawer on mobile
    await toggle.click();
    await mobilePage.waitForTimeout(400);

    const panel = mobilePage.locator('#yt-filter-panel');
    expect(await panel.getAttribute('class')).toContain('visible');

    // Verify drawer width fits inside mobile screen (<= 390px)
    const panelBoundingBox = await panel.boundingBox();
    expect(panelBoundingBox).not.toBeNull();
    if (panelBoundingBox) {
      expect(panelBoundingBox.width).toBeLessThanOrEqual(390);
    }

    // Close on mobile
    await mobilePage.locator('.ytf-close').evaluate((el: HTMLElement) => el.click());
    await mobilePage.waitForTimeout(300);

    expect(await panel.getAttribute('class')).not.toContain('visible');
    await mobileContext.close();
  }, 45000);
});
