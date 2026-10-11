import { expect, test } from "@playwright/test";
import path from "node:path";

const userscriptPath = path.resolve("dist/glidevideo.user.js");

test("handles touch skipping and left-hand visibility styles in a real browser", async ({
	page,
}) => {
	await page.setContent(`
		<!doctype html>
		<html>
			<body style="margin: 0">
				<video id="video" style="display:block;width:844px;height:390px"></video>
			</body>
		</html>
	`);
	await page.addScriptTag({ path: userscriptPath });
	await expect(page.locator(".mvc-ui-wrap")).toBeAttached();

	await page.evaluate(() => {
		const video = document.querySelector("video") as HTMLVideoElement;
		Object.defineProperties(video, {
			currentTime: { value: 20, writable: true, configurable: true },
			duration: { value: 120, configurable: true },
			paused: { value: false, configurable: true },
			readyState: { value: 4, configurable: true },
		});
		const controller = (window as any).__MVC_INSTANCE;
		controller.store.setActiveVideo(video);
		controller.videoTransform.attachUIToVideo(video);
	});

	await page.touchscreen.tap(650, 200);
	await page.touchscreen.tap(650, 200);
	await expect.poll(() => page.locator("#video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBe(30);

	await page.evaluate(() => {
		document.documentElement.setAttribute("data-mvc-left-hand", "true");
		const volumeBar = document.querySelector(".mvc-volume-bar") as HTMLElement;
		volumeBar.classList.add("visible");
	});
	await expect
		.poll(() =>
			page
				.locator(".mvc-volume-bar")
				.evaluate((bar) => getComputedStyle(bar).transform),
		)
		.toBe("matrix(1, 0, 0, 1, 0, 0)");
});
