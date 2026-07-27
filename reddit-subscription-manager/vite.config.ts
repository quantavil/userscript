/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
	plugins: [
		monkey({
			entry: "src/index.ts",
			userscript: {
				name: "Reddit Subscription Manager",
				namespace: "https://github.com/quantavil/userscript/reddit-subscription-manager",
				version: pkg.version,
				description: pkg.description,
				// old.reddit.com serves the same API on the same cookies; the script
				// reads location.origin so each host talks to itself and stays
				// same-origin. sh.reddit.com is what mobile lands on.
				match: [
					"https://www.reddit.com/*",
					"https://old.reddit.com/*",
					"https://sh.reddit.com/*",
				],
				grant: [],
				license: "MIT",
				"run-at": "document-idle",
			},
			build: {
				fileName: "reddit-subscription-manager.user.js",
			},
		}),
	],
	build: {
		minify: false,
		target: "es2022",
	},
	test: {
		environment: "happy-dom",
	},
});
