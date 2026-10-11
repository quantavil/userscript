// src/platform/extension-entry.ts — content-script entry for the Firefox build.
//
// StateStore reads settings synchronously in its constructor via GM_getValue,
// but extension storage is async. So the whole store is hydrated into a plain
// object first and the GM_* globals are defined over that cache; the app then
// boots against an API it already understands and nothing in src/ needs to
// know which of the two builds it is running in.
import { Controller } from "../core/Controller";

const api: any =
	(globalThis as any).browser ?? (globalThis as any).chrome ?? undefined;

async function boot() {
	if (!api?.storage?.local) return;

	let cache: Record<string, any> = {};
	try {
		cache = (await api.storage.local.get(null)) ?? {};
	} catch {}

	const g = globalThis as any;
	g.GM_getValue = (key: string, fallback?: any) =>
		key in cache ? cache[key] : fallback;
	g.GM_setValue = (key: string, val: any) => {
		cache[key] = val;
		api.storage.local.set({ [key]: val }).catch(() => {});
	};
	g.GM_deleteValue = (key: string) => {
		delete cache[key];
		api.storage.local.remove(key).catch(() => {});
	};
	// The userscript's per-site menu command is the toolbar button here.
	g.GM_registerMenuCommand = () => {};

	// Another tab (or the toolbar button) can write the same keys.
	try {
		api.storage.onChanged.addListener((changes: any, area: string) => {
			if (area !== "local") return;
			for (const key of Object.keys(changes)) {
				const { newValue } = changes[key];
				if (newValue === undefined) delete cache[key];
				else cache[key] = newValue;
			}
		});
	} catch {}

	const hostname = window.location?.hostname ?? "";
	if (hostname && cache[`disabled_${hostname}`]) return;

	new Controller();
}

boot();
