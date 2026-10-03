import { test, expect } from '@playwright/test';

test.describe('Voting Proxy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mock-reddit.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('triggering proxyUpvote clicks mock Reddit upvote button and updates aria-pressed', async ({ page }) => {
    // 1. Initially check aria-pressed is false
    const initialPressed = await page.locator('#t3_redgifs1 button[aria-label="Upvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    expect(initialPressed).toBe('false');

    // 2. Call proxyUpvote on extracted post
    const result = await page.evaluate(() => {
      const posts = (window as any).extractPosts();
      const post = posts.find((p: any) => p.id === 't3_redgifs1');
      const success = (window as any).proxyUpvote(post);
      return {
        success,
        isUpvotedInPost: post.isUpvoted,
      };
    });

    expect(result.success).toBe(true);
    expect(result.isUpvotedInPost).toBe(true);

    // 3. Verify the underlying DOM button now has aria-pressed="true"
    const updatedPressed = await page.locator('#t3_redgifs1 button[aria-label="Upvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    expect(updatedPressed).toBe('true');

    // 4. Trigger proxyUpvote again to toggle off (un-upvote)
    const toggleResult = await page.evaluate(() => {
      const posts = (window as any).extractPosts();
      const post = posts.find((p: any) => p.id === 't3_redgifs1');
      const success = (window as any).proxyUpvote(post);
      return {
        success,
        isUpvotedInPost: post.isUpvoted,
      };
    });

    expect(toggleResult.success).toBe(true);
    expect(toggleResult.isUpvotedInPost).toBe(false);

    // 5. Verify DOM button toggled back to aria-pressed="false"
    const toggledPressed = await page.locator('#t3_redgifs1 button[aria-label="Upvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    expect(toggledPressed).toBe('false');
  });

  test('downvoting cancels active upvote on the same post', async ({ page }) => {
    // 1. Upvote first
    await page.evaluate(() => {
      const posts = (window as any).extractPosts();
      const post = posts.find((p: any) => p.id === 't3_redgifs1');
      (window as any).proxyUpvote(post);
    });

    const upvotePressed = await page.locator('#t3_redgifs1 button[aria-label="Upvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    const downvotePressedBefore = await page.locator('#t3_redgifs1 button[aria-label="Downvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    expect(upvotePressed).toBe('true');
    expect(downvotePressedBefore).toBe('false');

    // 2. Now downvote
    const downvoteResult = await page.evaluate(() => {
      const posts = (window as any).extractPosts();
      const post = posts.find((p: any) => p.id === 't3_redgifs1');
      const success = (window as any).proxyDownvote(post);
      return {
        success,
        isUpvoted: post.isUpvoted,
        isDownvoted: post.isDownvoted,
      };
    });

    expect(downvoteResult.success).toBe(true);
    expect(downvoteResult.isDownvoted).toBe(true);
    expect(downvoteResult.isUpvoted).toBe(false);

    // 3. Verify DOM reflection
    const upvotePressedAfter = await page.locator('#t3_redgifs1 button[aria-label="Upvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    const downvotePressedAfter = await page.locator('#t3_redgifs1 button[aria-label="Downvote"]:not(.rr-action-btn)').getAttribute('aria-pressed');
    expect(upvotePressedAfter).toBe('false');
    expect(downvotePressedAfter).toBe('true');
  });
});
