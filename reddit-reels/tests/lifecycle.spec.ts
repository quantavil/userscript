import { test, expect } from '@playwright/test';

test.describe('Reel layout lifecycle (no launcher button)', () => {
  test.beforeEach(async ({ page }) => {
    // Reset prefs once per test (not on reloads inside the test).
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('__rr_test_init')) {
          localStorage.removeItem('@reddit-reels/enabled');
          sessionStorage.clear();
          sessionStorage.setItem('__rr_test_init', '1');
        }
      } catch {}
    });
    await page.goto('/mock-reddit.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('feed routes turn the reel layout on automatically, with no FAB', async ({ page }) => {
    await expect(page.locator('html')).toHaveClass(/rr-active/);
    await expect(page.locator('.rr-fab, #rr-fab-container')).toHaveCount(0);
    await expect(page.locator('#rr-header-cluster .rr-header-reel')).toBeVisible();
    await expect(page.locator('.rr-post-overlay').first()).toBeAttached();
  });

  test('the window is the scroller (not a nested container) and slides snap', async ({ page }) => {
    const info = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const main = document.querySelector('main');
      return {
        snap: html.scrollSnapType,
        mainOverflow: main ? getComputedStyle(main).overflowY : 'visible',
        scrollable: document.documentElement.scrollHeight > window.innerHeight,
      };
    });
    expect(info.snap).toContain('y');
    expect(info.mainOverflow).toBe('visible');
    expect(info.scrollable).toBe(true);
  });

  test('header toggle switches to list view, persists, and switches back', async ({ page }) => {
    const toggle = page.locator('#rr-header-cluster .rr-header-reel');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/rr-active/);
    await expect(page.locator('.rr-post-overlay')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('#rr-header-cluster .rr-header-reel')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/rr-active/);

    await page.locator('#rr-header-cluster .rr-header-reel').click();
    await expect(page.locator('html')).toHaveClass(/rr-active/);
  });

  test('Escape switches to list view', async ({ page }) => {
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/rr-active/);
  });

  test('opening a post (client-side navigation) stops the reel; Back restores it', async ({ page }) => {
    await page.evaluate(() => {
      history.pushState({}, '', '/r/test/comments/abc123/some_post/');
    });
    await expect(page.locator('html')).not.toHaveClass(/rr-active/);
    await expect(page.locator('#rr-header-cluster')).toHaveCount(0);

    await page.goBack();
    await expect(page.locator('html')).toHaveClass(/rr-active/);
    await expect(page.locator('#rr-header-cluster')).toBeAttached();
  });
});
