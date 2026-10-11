import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	use: {
		...devices["Desktop Chrome"],
		headless: true,
		viewport: { width: 844, height: 390 },
		hasTouch: true,
		isMobile: true,
	},
});
