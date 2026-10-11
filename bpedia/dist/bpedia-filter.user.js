// ==UserScript==
// @name         Babepedia Advanced Filter & Badges
// @namespace    quantavil/bpedia
// @version      2.4.0
// @author       quantavil
// @description  Advanced filtering and on-thumbnail stats/badges for Babepedia list pages with dynamic progress scraper and responsive Apple Glassmorphic UI.
// @license      GPL-3.0-or-later
// @match        https://www.babepedia.com/*
// @match        https://babepedia.com/*
// @connect      www.babepedia.com
// @connect      babepedia.com
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	var _GM_deleteValue = (() => typeof GM_deleteValue != "undefined" ? GM_deleteValue : void 0)();
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_listValues = (() => typeof GM_listValues != "undefined" ? GM_listValues : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
	_css(":root{--bp-glass-bg:#fdf6f0bf;--bp-solid-bg:#fdf6f0;--bp-glass-border:#ab520b2e;--bp-glass-shadow:#ab520b14;--bp-text:#272727;--bp-accent:#ab520b;--bp-accent-glow:#ab520b4d;--bp-success:#2e7d32;--bp-danger:#c62828}body.lightsoff{--bp-glass-bg:#1c1a19d9;--bp-solid-bg:#1c1a19;--bp-glass-border:#ffffff14;--bp-glass-shadow:#0006;--bp-text:#e0e0e0;--bp-accent:#ff973c;--bp-accent-glow:#ff973c4d;--bp-success:#4caf50;--bp-danger:#ef5350}.thumbshot{position:relative!important}.thumbshot>a{display:block;position:relative;overflow:hidden}.bp-badge{z-index:15;color:var(--bp-text);background:var(--bp-solid-bg);border:1px solid var(--bp-glass-border);box-shadow:0 2px 8px var(--bp-glass-shadow);pointer-events:none;border-radius:4px;align-items:center;gap:3px;padding:2px 6px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:10px;font-weight:700;transition:opacity .2s,transform .2s;display:inline-flex;position:absolute}.bp-badge svg{vertical-align:middle;display:inline-block}.bp-badge span{vertical-align:middle}.bp-badge-top-left{top:4px;left:4px}body.bp-hide-badges .bp-badge,#thumbs.bp-hide-badges .bp-badge,body.bp-hide-age .bp-badge-top-left,#thumbs.bp-hide-age .bp-badge-top-left,body.bp-hide-cup-boobs .bp-badge-bottom-left,#thumbs.bp-hide-cup-boobs .bp-badge-bottom-left,body.bp-hide-country .bp-badge-bottom-right,#thumbs.bp-hide-country .bp-badge-bottom-right{display:none!important}.bp-badge-bottom-left{bottom:6px;left:4px}.bp-badge-bottom-right{bottom:6px;right:4px}.thumbtext{z-index:10;position:relative}#bp-backdrop{z-index:9997;-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;background:#0000004d;transition:opacity .3s;position:fixed;inset:0}#bp-backdrop.active{opacity:1;pointer-events:auto}.bp-fab{z-index:9999;cursor:pointer;width:52px;height:52px;color:var(--bp-text);background:var(--bp-solid-bg);border:1px solid var(--bp-glass-border);box-shadow:0 8px 32px var(--bp-glass-shadow);border-radius:50%;justify-content:center;align-items:center;transition:transform .3s cubic-bezier(.175,.885,.32,1.275),box-shadow .3s,border-color .3s;display:flex;position:fixed;right:20px}.bp-fab:hover{box-shadow:0 8px 32px var(--bp-accent-glow);transform:scale(1.08)}.bp-fab:active{transform:scale(.95)}.bp-fab.active{border-color:var(--bp-accent);color:var(--bp-accent)}.bp-fab:focus-visible{border-color:var(--bp-accent);box-shadow:0 0 0 2px var(--bp-solid-bg), 0 0 0 4px var(--bp-accent);outline:none}.bp-fab svg{width:24px;height:24px;fill:var(--bp-text);transition:fill .3s}.bp-fab.active svg{fill:var(--bp-accent)}#bp-filter-fab{bottom:20px}.bp-fab-badge{background:var(--bp-accent);color:#fff;border-radius:50%;justify-content:center;align-items:center;width:18px;height:18px;font-size:10px;font-weight:700;display:flex;position:absolute;top:-2px;right:-2px;box-shadow:0 2px 6px #0003}.bp-drawer{z-index:9998;box-sizing:border-box;background:var(--bp-solid-bg);border-left:1px solid var(--bp-glass-border);width:330px;height:100vh;box-shadow:-10px 0 30px var(--bp-glass-shadow);color:var(--bp-text);flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;transition:right .4s cubic-bezier(.16,1,.3,1);display:flex;position:fixed;top:0;right:-360px}.bp-drawer.open{right:0}.bp-drawer-header{border-bottom:1px solid var(--bp-glass-border);justify-content:space-between;align-items:center;padding:18px 20px;display:flex}.bp-drawer-header h3{letter-spacing:-.5px;margin:0;font-size:18px;font-weight:700}.bp-header-actions{align-items:center;gap:8px;display:flex}.bp-icon-btn{cursor:pointer;color:var(--bp-text);background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:4px;transition:background-color .2s,color .2s;display:flex}.bp-icon-btn:hover{color:var(--bp-accent);background:#ab520b1a}body.lightsoff .bp-icon-btn:hover{color:var(--bp-accent);background:#ff973c26}.bp-close-btn svg{width:20px;height:20px;stroke:var(--bp-text)}.bp-drawer-body{flex:1;padding:15px 20px 80px;overflow-y:auto}.bp-status-line{text-align:center;color:var(--bp-accent);border:1px solid var(--bp-glass-border);background:#ab520b14;border-radius:6px;margin-bottom:12px;padding:8px 12px;font-size:12px;font-weight:700}.bp-section{border-bottom:1px solid #ab520b14;margin-bottom:20px;padding-bottom:15px}.bp-section-title{text-transform:uppercase;letter-spacing:.8px;color:var(--bp-accent);justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;font-weight:700;display:flex}.bp-input-group{margin-bottom:12px}.bp-input-group label{opacity:.85;margin-bottom:4px;font-size:11px;font-weight:600;display:block}.bp-text-input{box-sizing:border-box;border:1px solid var(--bp-glass-border);width:100%;color:var(--bp-text);background:#ffffff26;border-radius:6px;outline:none;padding:8px 12px;font-size:13px;transition:border-color .2s}body.lightsoff .bp-text-input{background:#0003}.bp-text-input:focus{border-color:var(--bp-accent)}.bp-icon-btn:focus-visible,.bp-close-btn:focus-visible,.bp-segmented-btn:focus-visible,.bp-tag:focus-visible,.bp-btn-danger:focus-visible,.bp-btn-reset:focus-visible,.bp-text-input:focus-visible{outline:2px solid var(--bp-accent);outline-offset:2px}.bp-range-display{float:right;font-size:12px;font-weight:700}.bp-slider{-webkit-appearance:none;background:#ab520b26;border-radius:2px;outline:none;width:100%;height:4px}.bp-slider::-webkit-slider-thumb{appearance:none;background:var(--bp-accent);cursor:pointer;border:1px solid #ffffff80;border-radius:50%;width:16px;height:16px;transition:transform .1s;box-shadow:0 1px 4px #0003}.bp-slider::-webkit-slider-thumb:hover{transform:scale(1.15)}.bp-segmented{border:1px solid var(--bp-glass-border);background:#0000000d;border-radius:6px;margin-top:4px;display:flex;overflow:hidden}body.lightsoff .bp-segmented{background:#ffffff0d}.bp-segmented-btn{color:var(--bp-text);cursor:pointer;text-align:center;background:0 0;border:none;flex:1;padding:8px;font-size:11px;font-weight:600;transition:background .2s,color .2s}.bp-segmented-btn:not(:last-child){border-right:1px solid var(--bp-glass-border)}.bp-segmented-btn.active{background:var(--bp-accent);color:#fff}.bp-switch-row{justify-content:space-between;align-items:center;margin-bottom:10px;display:flex}.bp-switch-row label{font-size:12px;font-weight:600}.bp-switch{width:44px;height:24px;display:inline-block;position:relative}.bp-switch input{opacity:0;width:0;height:0}.bp-switch-slider{cursor:pointer;border:1px solid var(--bp-glass-border);background-color:#0000001a;border-radius:24px;transition:all .3s;position:absolute;inset:0}body.lightsoff .bp-switch-slider{background-color:#ffffff1a}.bp-switch-slider:before{content:\"\";background-color:#fff;border-radius:50%;width:18px;height:18px;transition:all .3s;position:absolute;bottom:2px;left:2px;box-shadow:0 1px 3px #0003}.bp-switch input:checked+.bp-switch-slider{background-color:var(--bp-success)}.bp-switch input:checked+.bp-switch-slider:before{transform:translate(20px)}.bp-tag-container{border:1px solid var(--bp-glass-border);background:#00000008;border-radius:6px;flex-wrap:wrap;gap:6px;max-height:120px;padding:5px;display:flex;overflow-y:auto}body.lightsoff .bp-tag-container{background:#ffffff05}.bp-tag{border:1px solid var(--bp-glass-border);cursor:pointer;-webkit-user-select:none;user-select:none;color:var(--bp-text);background:#fff3;border-radius:12px;padding:4px 8px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:11px;transition:all .2s}body.lightsoff .bp-tag{background:#0003}.bp-tag.active{background:var(--bp-accent);color:#fff;border-color:var(--bp-accent)}#bp-progress-bar-container{z-index:10000;opacity:0;pointer-events:none;background:#0000000d;width:100%;height:3px;transition:opacity .4s;position:fixed;top:0;left:0}#bp-progress-bar-container.active{opacity:1}#bp-progress-bar{background:linear-gradient(90deg, var(--bp-accent), var(--bp-success));width:0%;height:100%;transition:width .3s}.bp-btn-danger{border:1px solid var(--bp-danger);width:100%;color:var(--bp-danger);cursor:pointer;background:#c6282826;border-radius:6px;padding:10px;font-weight:700;transition:background .2s}.bp-btn-danger:hover{background:var(--bp-danger);color:#fff}.bp-btn-reset{border:1px solid var(--bp-glass-border);width:100%;color:var(--bp-text);cursor:pointer;background:#ab520b14;border-radius:6px;padding:10px;font-size:13px;font-weight:600;transition:background .2s,border-color .2s}.bp-btn-reset:hover{background:var(--bp-accent);border-color:var(--bp-accent);color:#fff}.sr-only{clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}@media (width<=600px){.bp-drawer{border-left:none;width:100vw;right:-100vw}.bp-fab{width:48px;height:48px;right:15px}#bp-filter-fab{bottom:15px}.bp-text-input{font-size:16px}}@media (prefers-reduced-motion:reduce){.bp-drawer,.bp-fab,.bp-badge,.bp-switch-slider,.bp-switch-slider:before{transition:none!important}}");
	var PROFILE_PREFIX = "bprof_";
	var BADGE_SETTINGS_KEY = "badge_settings";
	var FILTER_SETTINGS_KEY = "filter_settings";
	var filterSettingsTimeout = null;
	var inMemoryFilterSettings = null;
	var dbCache = new Map();
	var DEFAULT_BADGE_SETTINGS = {
		showAge: true,
		showCupBoobs: true,
		showCountry: true
	};
	var DEFAULT_FILTER_SETTINGS = {
		minAge: 18,
		maxAge: 70,
		minHeight: 130,
		maxHeight: 220,
		minRating: 0,
		minFavorites: 0,
		boobs: "all",
		professionFilter: "all",
		ethnicities: [],
		hairColors: [],
		eyeColors: [],
		cupSizes: [],
		performances: [],
		searchQuery: ""
	};
	var safeParse = (json, fallback) => {
		if (!json) return fallback;
		try {
			return JSON.parse(json);
		} catch {
			return fallback;
		}
	};
	var Cache = {
		initDbCache() {
			dbCache.clear();
			_GM_listValues().forEach((key) => {
				if (key.startsWith(PROFILE_PREFIX)) {
					const clean = key.substring(6);
					const parsed = safeParse(_GM_getValue(key, null), null);
					if (parsed) dbCache.set(clean, parsed);
				}
			});
		},
		getProfile(url) {
			const clean = cleanUrl(url);
			return dbCache.get(clean) || null;
		},
		setProfile(url, profile) {
			const clean = cleanUrl(url);
			dbCache.set(clean, profile);
			_GM_setValue(PROFILE_PREFIX + clean, JSON.stringify(profile));
		},
		getBadgeSettings() {
			const stored = _GM_getValue(BADGE_SETTINGS_KEY, null);
			return {
				...DEFAULT_BADGE_SETTINGS,
				...safeParse(stored, {})
			};
		},
		setBadgeSettings(settings) {
			_GM_setValue(BADGE_SETTINGS_KEY, JSON.stringify(settings));
		},
		getFilterSettings() {
			if (inMemoryFilterSettings) return inMemoryFilterSettings;
			inMemoryFilterSettings = validateFilterSettings(safeParse(_GM_getValue(FILTER_SETTINGS_KEY, null), {}));
			return inMemoryFilterSettings;
		},
		setFilterSettings(settings, debounce = false) {
			inMemoryFilterSettings = settings;
			if (filterSettingsTimeout) clearTimeout(filterSettingsTimeout);
			if (debounce) filterSettingsTimeout = setTimeout(() => {
				_GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
				filterSettingsTimeout = null;
			}, 300);
			else _GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(settings));
		},
		flushFilterSettings() {
			if (filterSettingsTimeout) {
				clearTimeout(filterSettingsTimeout);
				filterSettingsTimeout = null;
				if (inMemoryFilterSettings) _GM_setValue(FILTER_SETTINGS_KEY, JSON.stringify(inMemoryFilterSettings));
			}
		},
		clearAllProfiles() {
			dbCache.clear();
			const allKeys = _GM_listValues();
			let count = 0;
			allKeys.forEach((key) => {
				if (key.startsWith(PROFILE_PREFIX)) {
					_GM_deleteValue(key);
					count++;
				}
			});
			console.log(`[BP Filter] Cleared ${count} cached profiles`);
		},
		clearEverything() {
			dbCache.clear();
			inMemoryFilterSettings = null;
			if (filterSettingsTimeout) {
				clearTimeout(filterSettingsTimeout);
				filterSettingsTimeout = null;
			}
			_GM_listValues().forEach((key) => {
				_GM_deleteValue(key);
			});
			console.log("[BP Filter] Cleared all storage");
		},
		exportData() {
			const data = {
				version: "2.3.0",
				exportedAt: Date.now(),
				settings: {
					[BADGE_SETTINGS_KEY]: this.getBadgeSettings(),
					[FILTER_SETTINGS_KEY]: this.getFilterSettings()
				},
				profiles: {}
			};
			dbCache.forEach((profile, clean) => {
				data.profiles[clean] = profile;
			});
			return JSON.stringify(data, null, 2);
		},
		importData(jsonString) {
			try {
				const data = JSON.parse(jsonString);
				if (!data || typeof data !== "object") return false;
				if (data.profiles && typeof data.profiles === "object") Object.entries(data.profiles).forEach(([rawUrl, profile]) => {
					const clean = cleanUrl(rawUrl);
					const key = PROFILE_PREFIX + clean;
					if (profile && typeof profile === "object") {
						_GM_setValue(key, JSON.stringify(profile));
						dbCache.set(clean, profile);
					}
				});
				if (data.settings && typeof data.settings === "object") Object.entries(data.settings).forEach(([key, val]) => {
					if (key === BADGE_SETTINGS_KEY || key === FILTER_SETTINGS_KEY) {
						if (key === FILTER_SETTINGS_KEY) {
							const validated = validateFilterSettings(val);
							_GM_setValue(key, JSON.stringify(validated));
							inMemoryFilterSettings = validated;
						} else _GM_setValue(key, JSON.stringify(val));
					}
				});
				return true;
			} catch (e) {
				console.error("[BP Cache] Import failed:", e);
				return false;
			}
		}
	};
	function validateFilterSettings(input) {
		const res = { ...DEFAULT_FILTER_SETTINGS };
		if (!input || typeof input !== "object") return res;
		if (typeof input.searchQuery === "string") res.searchQuery = input.searchQuery;
		if (typeof input.minAge === "number") res.minAge = input.minAge;
		if (typeof input.maxAge === "number") res.maxAge = input.maxAge;
		if (typeof input.minHeight === "number") res.minHeight = input.minHeight;
		if (typeof input.maxHeight === "number") res.maxHeight = input.maxHeight;
		if (typeof input.minRating === "number") res.minRating = input.minRating;
		if (typeof input.minFavorites === "number") res.minFavorites = input.minFavorites;
		if ([
			"all",
			"natural",
			"implants"
		].includes(input.boobs)) res.boobs = input.boobs;
		if ([
			"all",
			"pornstar",
			"non-pornstar"
		].includes(input.professionFilter)) res.professionFilter = input.professionFilter;
		if (Array.isArray(input.ethnicities)) res.ethnicities = input.ethnicities.filter((x) => typeof x === "string");
		if (Array.isArray(input.hairColors)) res.hairColors = input.hairColors.filter((x) => typeof x === "string");
		if (Array.isArray(input.eyeColors)) res.eyeColors = input.eyeColors.filter((x) => typeof x === "string");
		if (Array.isArray(input.cupSizes)) res.cupSizes = input.cupSizes.filter((x) => typeof x === "string");
		if (Array.isArray(input.performances)) res.performances = input.performances.filter((x) => typeof x === "string");
		return res;
	}
	function cleanUrl(url) {
		if (!url) return "";
		return url.replace(/^https?:\/\/[^/]+/, "").split("?")[0].split("#")[0].replace(/^\/?babe\//, "").replace(/^\//, "").replace(/\/$/, "");
	}
	var NATIONALITY_MAP = {
		american: "US",
		russian: "RU",
		czech: "CZ",
		ukrainian: "UA",
		british: "GB",
		english: "GB",
		canadian: "CA",
		australian: "AU",
		french: "FR",
		german: "DE",
		italian: "IT",
		spanish: "ES",
		hungarian: "HU",
		polish: "PL",
		japanese: "JP",
		brazilian: "BR",
		swedish: "SE",
		dutch: "NL",
		belgian: "BE",
		austrian: "AT",
		swiss: "CH",
		romanian: "RO",
		slovak: "SK",
		bulgarian: "BG",
		croatian: "HR",
		colombian: "CO",
		mexican: "MX",
		venezuelan: "VE",
		argentinian: "AR",
		chilean: "CL",
		peruvian: "PE",
		filipino: "PH",
		thai: "TH",
		vietnamese: "VN",
		chinese: "CN",
		korean: "KR",
		taiwanese: "TW",
		indian: "IN",
		south_african: "ZA",
		norwegian: "NO",
		danish: "DK",
		finnish: "FI",
		irish: "IE",
		portuguese: "PT",
		greek: "GR",
		turkish: "TR",
		israeli: "IL",
		latvian: "LV",
		lithuanian: "LT",
		estonian: "EE",
		belarusian: "BY",
		moldovan: "MD",
		georgian: "GE",
		armenian: "AM",
		azerbaijani: "AZ",
		kazakh: "KZ",
		uzbek: "UZ",
		new_zealander: "NZ",
		cuban: "CU",
		puerto_rican: "PR",
		serbian: "RS",
		slovenian: "SI",
		bosnian: "BA",
		montenegrin: "ME",
		albanian: "AL",
		macedonian: "MK",
		icelandic: "IS",
		luxembourgish: "LU",
		maltese: "MT",
		cypriot: "CY",
		singaporean: "SG",
		malaysian: "MY",
		indonesian: "ID",
		egyptian: "EG",
		moroccan: "MA",
		tunisian: "TN",
		lebanese: "LB",
		iranian: "IR",
		nigerian: "NG",
		kenyan: "KE",
		jamaican: "JM",
		trinidadian: "TT",
		dominican: "DO",
		ecuadorian: "EC",
		uruguayan: "UY",
		paraguayan: "PY",
		bolivian: "BO",
		costa_rican: "CR",
		panamanian: "PA",
		guatemalan: "GT",
		honduran: "HN",
		salvadoran: "SV",
		nicaraguan: "NI"
	};
	function getCountryCode(nationality) {
		if (!nationality) return null;
		return NATIONALITY_MAP[nationality.trim().toLowerCase().replace(/\s+/g, "_")] || null;
	}
	var domParser = new DOMParser();
	function parseProfileHtml(html, url, name) {
		if (html.includes("cf-chl-opt") || html.includes("challenge-platform") || /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html)) throw new Error("Cloudflare challenge encountered.");
		const doc = domParser.parseFromString(html, "text/html");
		const profile = {
			name,
			url,
			scrapedAt: Date.now(),
			personal: {
				age: null,
				nationality: null,
				countryCode: null,
				ethnicity: null,
				sexuality: null,
				professions: []
			},
			body: {
				hairColor: null,
				eyeColor: null,
				heightCm: null,
				weightKg: null,
				bodyType: null,
				measurements: null,
				bust: null,
				waist: null,
				hips: null,
				cup: null,
				boobs: "Unknown"
			},
			performances: {
				solo: [],
				girlGirl: [],
				boyGirl: []
			},
			rating: {
				score: null,
				votes: null,
				favorites: null
			}
		};
		const infoItems = doc.querySelectorAll("#personal-info-block .info-item, .info-grid .info-item, #bioarea .info-item");
		if (infoItems.length === 0) throw new Error("Verification failed: Personal info block is missing or empty.");
		infoItems.forEach((item) => {
			const labelEl = item.querySelector(".label");
			const valueEl = item.querySelector(".value");
			if (!labelEl || !valueEl) return;
			const label = labelEl.textContent?.trim().toLowerCase().replace(":", "") || "";
			const value = valueEl.textContent?.trim() || "";
			switch (label) {
				case "age": {
					const match = value.match(/(\d+)/);
					if (match) profile.personal.age = parseInt(match[1], 10);
					break;
				}
				case "nationality": {
					const parenMatch = value.match(/\(([^)]+)\)/);
					if (parenMatch) profile.personal.nationality = parenMatch[1].trim();
					else profile.personal.nationality = value.replace(/[^\w\s-]/g, "").trim();
					profile.personal.countryCode = getCountryCode(profile.personal.nationality);
					break;
				}
				case "ethnicity":
					profile.personal.ethnicity = value;
					break;
				case "sexuality":
					profile.personal.sexuality = value;
					break;
				case "professions":
					profile.personal.professions = value.split(",").map((p) => p.replace(/\(former\)|\(active\)/gi, "").trim().toLowerCase()).filter(Boolean);
					break;
				case "hair color":
					profile.body.hairColor = value;
					break;
				case "eye color":
					profile.body.eyeColor = value;
					break;
				case "height": {
					const cmMatch = value.match(/(\d+)\s*cm/i);
					if (cmMatch) profile.body.heightCm = parseInt(cmMatch[1], 10);
					else {
						const ftInMatch = value.match(/(\d+)'\s*(\d+)/);
						if (ftInMatch) {
							const ft = parseInt(ftInMatch[1], 10);
							const inch = parseInt(ftInMatch[2], 10);
							profile.body.heightCm = Math.round((ft * 12 + inch) * 2.54);
						}
					}
					break;
				}
				case "weight": {
					const kgMatch = value.match(/(\d+)\s*kg/i);
					if (kgMatch) profile.body.weightKg = parseInt(kgMatch[1], 10);
					else {
						const lbsMatch = value.match(/(\d+)\s*lbs/i);
						if (lbsMatch) profile.body.weightKg = Math.round(parseInt(lbsMatch[1], 10) * .453592);
					}
					break;
				}
				case "body type":
					profile.body.bodyType = value;
					break;
				case "measurements": {
					profile.body.measurements = value;
					const mparts = value.match(/(\d+)\s*[-–—/]\s*(\d+)\s*[-–—/]\s*(\d+)/);
					if (mparts) {
						profile.body.bust = parseInt(mparts[1], 10) || null;
						profile.body.waist = parseInt(mparts[2], 10) || null;
						profile.body.hips = parseInt(mparts[3], 10) || null;
					}
					break;
				}
				case "bra/cup size": {
					const cupMatch = value.replace(/show\s*conversions.*/i, "").trim().match(/(?:\d+)?\s*([A-Za-z]+)/);
					profile.body.cup = cupMatch ? cupMatch[1].toUpperCase() : null;
					break;
				}
				case "boobs":
					if (/real|natural/i.test(value)) profile.body.boobs = "Natural";
					else if (/implant|fake|augmented|enhanced/i.test(value)) profile.body.boobs = "Implants";
					break;
				case "solo":
					profile.performances.solo = value.split(",").map((p) => p.trim()).filter(Boolean);
					break;
				case "girl/girl":
					profile.performances.girlGirl = value.split(",").map((p) => p.trim()).filter(Boolean);
					break;
				case "boy/girl": profile.performances.boyGirl = value.split(",").map((p) => p.trim()).filter(Boolean);
			}
		});
		const ratingBox = doc.querySelector(".rating-global");
		if (ratingBox) {
			const scoreMatch = (ratingBox.querySelector("strong")?.textContent || "").match(/(\d+\.?\d*)/);
			if (scoreMatch) profile.rating.score = parseFloat(scoreMatch[1]);
			const smalls = Array.from(ratingBox.querySelectorAll("small"));
			const votesMatch = (smalls.find((el) => /vote/i.test(el.textContent || "")) || smalls[smalls.length - 1])?.textContent?.replace(/,/g, "").match(/(\d+)/);
			if (votesMatch) profile.rating.votes = parseInt(votesMatch[1], 10);
		}
		const favBox = doc.querySelector(".rating-fav");
		if (favBox) {
			const favMatch = (favBox.querySelector("div")?.textContent || "").replace(/,/g, "").match(/(\d+)/);
			if (favMatch) profile.rating.favorites = parseInt(favMatch[1], 10);
		}
		return profile;
	}
	function extractPerformerName(thumb, anchor) {
		const a = anchor || thumb.querySelector("a[href*=\"/babe/\"]") || thumb.querySelector("a");
		const url = a?.getAttribute("href") || "";
		let name = "";
		const textLink = thumb.querySelector(".thumbtext a");
		if (textLink) name = textLink.textContent?.trim() || "";
		else {
			const textEl = thumb.querySelector(".thumbtext");
			if (textEl) {
				const rawText = textEl.textContent || "";
				const colonIdx = rawText.indexOf(":");
				name = colonIdx !== -1 ? rawText.substring(colonIdx + 1).trim() : rawText.trim();
			} else name = a?.getAttribute("title")?.trim() || url.split("/").pop()?.replace(/_/g, " ") || "";
		}
		return name.split("\n")[0].replace(/\s*\d+(?:\.\d+)?\/10.*$/, "").replace(/^#\d+:\s*/, "").trim();
	}
	var container = null;
	var bar = null;
	var fadeTimeout = null;
	var cachedTitleEl = null;
	var ProgressBar = {
		init() {
			if (document.getElementById("bp-progress-bar-container")) return;
			container = document.createElement("div");
			container.id = "bp-progress-bar-container";
			container.setAttribute("role", "progressbar");
			container.setAttribute("aria-valuemin", "0");
			container.setAttribute("aria-valuemax", "100");
			container.setAttribute("aria-valuenow", "0");
			bar = document.createElement("div");
			bar.id = "bp-progress-bar";
			container.appendChild(bar);
			document.body.appendChild(container);
			cachedTitleEl = null;
		},
		show() {
			if (fadeTimeout) clearTimeout(fadeTimeout);
			this.init();
			container?.classList.add("active");
		},
		getTitleEl() {
			if (!cachedTitleEl) cachedTitleEl = document.querySelector("#bp-filter-drawer .bp-drawer-header h3");
			return cachedTitleEl;
		},
		isSettingsViewVisible() {
			const settingsView = document.getElementById("bp-settings-view");
			return !!settingsView && settingsView.style.display !== "none";
		},
		setTitle(text) {
			if (this.isSettingsViewVisible()) return;
			const titleEl = this.getTitleEl();
			if (titleEl) titleEl.textContent = text;
		},
		update(current, total) {
			this.show();
			if (!bar) return;
			const percent = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
			bar.style.width = `${percent}%`;
			container?.setAttribute("aria-valuenow", String(percent));
			container?.setAttribute("aria-valuetext", `Scraping progress: ${percent}%`);
			this.setTitle(percent < 100 ? `Scraping (${current}/${total})` : "Babepedia Filter");
			if (percent >= 100) this.hide();
		},
		hide() {
			if (fadeTimeout) clearTimeout(fadeTimeout);
			fadeTimeout = setTimeout(() => {
				container?.classList.remove("active");
				if (bar) bar.style.width = "0%";
				this.setTitle("Babepedia Filter");
			}, 1e3);
		}
	};
	var Badges = { render(thumbshotEl, profile) {
		if (thumbshotEl.hasAttribute("data-bp-badged")) return;
		const anchor = thumbshotEl.querySelector("a");
		if (!anchor) return;
		thumbshotEl.setAttribute("data-bp-badged", "true");
		if (profile.personal.age) {
			const badge = document.createElement("div");
			badge.className = "bp-badge bp-badge-top-left";
			badge.textContent = `${profile.personal.age}y`;
			anchor.appendChild(badge);
		}
		if (profile.body.cup || profile.body.boobs !== "Unknown") {
			const badge = document.createElement("div");
			badge.className = "bp-badge bp-badge-bottom-left";
			if (profile.body.boobs !== "Unknown") {
				const color = profile.body.boobs === "Natural" ? "var(--bp-success)" : "var(--bp-danger)";
				const svgNS = "http://www.w3.org/2000/svg";
				const svg = document.createElementNS(svgNS, "svg");
				svg.setAttribute("viewBox", "0 0 10 10");
				svg.setAttribute("width", "8");
				svg.setAttribute("height", "8");
				svg.setAttribute("role", "img");
				svg.setAttribute("aria-label", profile.body.boobs);
				const title = document.createElementNS(svgNS, "title");
				title.textContent = profile.body.boobs;
				svg.appendChild(title);
				const circle = document.createElementNS(svgNS, "circle");
				circle.setAttribute("cx", "5");
				circle.setAttribute("cy", "5");
				circle.setAttribute("r", "4.5");
				circle.setAttribute("fill", color);
				svg.appendChild(circle);
				badge.appendChild(svg);
			}
			const text = profile.body.cup || (profile.body.boobs === "Natural" ? "Nat" : "Imp");
			const span = document.createElement("span");
			span.textContent = text;
			badge.appendChild(span);
			anchor.appendChild(badge);
		}
		if (profile.personal.countryCode) {
			const badge = document.createElement("div");
			badge.className = "bp-badge bp-badge-bottom-right";
			badge.textContent = profile.personal.countryCode;
			anchor.appendChild(badge);
		}
	} };
	var NS = "http://www.w3.org/2000/svg";
	function svg(size, strokeWidth = 2, fill = "none", stroke = "currentColor") {
		const s = document.createElementNS(NS, "svg");
		s.setAttribute("width", String(size));
		s.setAttribute("height", String(size));
		s.setAttribute("viewBox", "0 0 24 24");
		s.setAttribute("fill", fill);
		if (stroke !== "none") {
			s.setAttribute("stroke", stroke);
			s.setAttribute("stroke-width", String(strokeWidth));
			s.setAttribute("stroke-linecap", "round");
			s.setAttribute("stroke-linejoin", "round");
		}
		return s;
	}
	var PATHS = {
		filter: {
			paths: ["M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"],
			isStroke: false,
			fill: "currentColor",
			stroke: "none"
		},
		settings: {
			paths: ["M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"],
			isStroke: false,
			fill: "currentColor",
			stroke: "none"
		},
		x: {
			paths: ["M18 6 6 18", "M6 6l12 12"],
			isStroke: true
		},
		back: {
			paths: ["M19 12H5", "M12 19l-7-7 7-7"],
			isStroke: true
		}
	};
	function icon(name, size = 20, strokeWidth = 2) {
		const conf = PATHS[name];
		if (!conf) {
			console.warn(`[BP Filter] Unknown icon requested: ${name}`);
			return svg(size, strokeWidth);
		}
		const s = svg(size, strokeWidth, conf.fill || "none", conf.stroke || "currentColor");
		conf.paths.forEach((d) => {
			const el = document.createElementNS(NS, "path");
			el.setAttribute("d", d);
			if (!conf.isStroke) el.setAttribute("fill", conf.fill || "currentColor");
			s.appendChild(el);
		});
		return s;
	}
	var filterFab = null;
	var filterDrawer = null;
	var backdrop = null;
	var activeFiltersCountEl = null;
	var statusLineEl = null;
	var knownEthnicities = new Set();
	var knownHairColors = new Set();
	var knownEyeColors = new Set();
	var knownCups = new Set();
	var knownPerformances = new Set();
	var searchDebounce = null;
	var getVal = (id) => document.getElementById(id)?.value ?? "";
	var setVal = (id, value) => {
		const el = document.getElementById(id);
		if (el) el.value = String(value);
	};
	var activeTags = (cid) => {
		const c = document.getElementById(cid);
		if (!c) return [];
		return Array.from(c.querySelectorAll(".bp-tag.active")).map((el) => el.textContent || "");
	};
	var FilterPanel = {
		init(onFilterChange) {
			if (document.getElementById("bp-filter-fab")) return;
			this.createBackdrop();
			this.createFABs();
			this.createDrawers();
			this.setupEvents(onFilterChange);
			this.applySettingsUI();
		},
		createBackdrop() {
			backdrop = document.createElement("div");
			backdrop.id = "bp-backdrop";
			document.body.appendChild(backdrop);
		},
		createFABs() {
			filterFab = document.createElement("button");
			filterFab.id = "bp-filter-fab";
			filterFab.className = "bp-fab";
			filterFab.title = "Filter Performers";
			filterFab.setAttribute("aria-label", "Filter Performers");
			filterFab.appendChild(icon("filter", 24));
			const badge = document.createElement("span");
			badge.className = "bp-fab-badge";
			badge.style.display = "none";
			badge.textContent = "0";
			filterFab.appendChild(badge);
			document.body.appendChild(filterFab);
			activeFiltersCountEl = badge;
		},
		createDrawers() {
			filterDrawer = document.createElement("div");
			filterDrawer.id = "bp-filter-drawer";
			filterDrawer.className = "bp-drawer";
			filterDrawer.setAttribute("role", "dialog");
			filterDrawer.setAttribute("aria-modal", "true");
			filterDrawer.setAttribute("aria-labelledby", "bp-drawer-title");
			filterDrawer.innerHTML = `
      <div class="bp-drawer-header">
        <h3 id="bp-drawer-title">Babepedia Filter</h3>
        <div class="bp-header-actions">
          <button id="bp-drawer-settings-toggle" class="bp-icon-btn" title="Settings"></button>
          <button class="bp-icon-btn bp-close-btn" title="Close Panel"></button>
        </div>
      </div>
      
      <!-- Filters View -->
      <div id="bp-filters-view" class="bp-drawer-body">
        <!-- Status Line -->
        <div id="bp-status-line" class="bp-status-line" style="display:none;"></div>

        <!-- Search -->
        <div class="bp-section">
          <div class="bp-input-group">
            <label for="bp-search" class="sr-only">Search performers by name</label>
            <input type="search" id="bp-search" class="bp-text-input" placeholder="Search by name..." />
          </div>
        </div>

        <!-- Personal -->
        <div class="bp-section">
          <div class="bp-section-title">Personal Details</div>

          <div class="bp-input-group">
            <label id="bp-profession-label">Performer Type</label>
            <div class="bp-segmented" id="bp-profession-segment" role="radiogroup" aria-labelledby="bp-profession-label">
              <button class="bp-segmented-btn active" data-val="all" role="radio" aria-checked="true">All</button>
              <button class="bp-segmented-btn" data-val="pornstar" role="radio" aria-checked="false">Porn Star</button>
              <button class="bp-segmented-btn" data-val="non-pornstar" role="radio" aria-checked="false">Model Only</button>
            </div>
          </div>

          <div class="bp-input-group">
            <label>Min Age <span class="bp-range-display" id="bp-lbl-min-age">18</span></label>
            <input type="range" id="bp-min-age" class="bp-slider" min="18" max="70" value="18" />
          </div>
          <div class="bp-input-group">
            <label>Max Age <span class="bp-range-display" id="bp-lbl-max-age">70</span></label>
            <input type="range" id="bp-max-age" class="bp-slider" min="18" max="70" value="70" />
          </div>

          <div class="bp-input-group">
            <label>Ethnicities</label>
            <div id="bp-ethnicities-container" class="bp-tag-container"></div>
          </div>
        </div>

        <!-- Body -->
        <div class="bp-section">
          <div class="bp-section-title">Body Stats</div>

          <div class="bp-input-group">
            <label id="bp-boobs-label">Boobs Type</label>
            <div class="bp-segmented" id="bp-boobs-segment" role="radiogroup" aria-labelledby="bp-boobs-label">
              <button class="bp-segmented-btn active" data-val="all" role="radio" aria-checked="true">All</button>
              <button class="bp-segmented-btn" data-val="natural" role="radio" aria-checked="false">Natural</button>
              <button class="bp-segmented-btn" data-val="implants" role="radio" aria-checked="false">Implants</button>
            </div>
          </div>

          <div class="bp-input-group">
            <label>Min Height <span class="bp-range-display" id="bp-lbl-min-height">130 cm</span></label>
            <input type="range" id="bp-min-height" class="bp-slider" min="130" max="220" value="130" />
          </div>
          <div class="bp-input-group">
            <label>Max Height <span class="bp-range-display" id="bp-lbl-max-height">220 cm</span></label>
            <input type="range" id="bp-max-height" class="bp-slider" min="130" max="220" value="220" />
          </div>

          <div class="bp-input-group">
            <label>Cup Size</label>
            <div id="bp-cups-container" class="bp-tag-container"></div>
          </div>

          <div class="bp-input-group">
            <label>Hair Color</label>
            <div id="bp-hair-container" class="bp-tag-container"></div>
          </div>

          <div class="bp-input-group">
            <label>Eye Color</label>
            <div id="bp-eyes-container" class="bp-tag-container"></div>
          </div>
        </div>

        <!-- Performances -->
        <div class="bp-section">
          <div class="bp-section-title">Performance Acts</div>
          <div class="bp-input-group">
            <div id="bp-performances-container" class="bp-tag-container" style="max-height: 140px;"></div>
          </div>
        </div>

        <!-- Ratings -->
        <div class="bp-section">
          <div class="bp-section-title">Ratings & Popularity</div>

          <div class="bp-input-group">
            <label>Min Rating <span class="bp-range-display" id="bp-lbl-min-rating">0.0</span></label>
            <input type="range" id="bp-min-rating" class="bp-slider" min="0" max="10" step="0.1" value="0" />
          </div>

          <div class="bp-input-group">
            <label for="bp-min-favs">Min Favorites</label>
            <input type="number" id="bp-min-favs" class="bp-text-input" min="0" placeholder="e.g. 500" />
          </div>
        </div>

        <!-- Reset -->
        <div class="bp-section" style="border-bottom:none;">
          <button id="bp-reset-filters-btn" class="bp-btn-reset">Reset All Filters</button>
        </div>
      </div>

      <!-- Settings View -->
      <div id="bp-settings-view" class="bp-drawer-body" style="display:none;">
        <div class="bp-section">
          <div class="bp-section-title">Badge Configuration</div>

          <div class="bp-switch-row">
            <label for="bp-sett-age">Show Age</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-age" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label for="bp-sett-cup-boobs">Show Cup & Boobs Status</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-cup-boobs" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
          <div class="bp-switch-row">
            <label for="bp-sett-country">Show Nationality</label>
            <label class="bp-switch">
              <input type="checkbox" id="bp-sett-country" checked />
              <span class="bp-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Import / Export Section -->
        <div class="bp-section">
          <div class="bp-section-title">Backup & Sync</div>
          <div style="display:flex; gap:8px;">
            <button id="bp-export-btn" class="bp-btn-reset" style="flex:1;">Export JSON</button>
            <button id="bp-import-btn" class="bp-btn-reset" style="flex:1;">Import JSON</button>
          </div>
          <input type="file" id="bp-import-file" accept=".json" style="display:none;" />
        </div>

        <div class="bp-section">
          <div class="bp-section-title">Database Utilities</div>
          <button id="bp-clear-profiles-btn" class="bp-btn-danger">Clear Cached Profiles</button>
          <button id="bp-clear-all-btn" class="bp-btn-danger" style="margin-top:8px;">Clear Everything & Reload</button>
        </div>
      </div>
    `;
			document.body.appendChild(filterDrawer);
			const settingsBtn = filterDrawer.querySelector("#bp-drawer-settings-toggle");
			if (settingsBtn) {
				settingsBtn.appendChild(icon("settings", 20));
				settingsBtn.setAttribute("aria-label", "Settings");
			}
			const closeBtn = filterDrawer.querySelector(".bp-close-btn");
			if (closeBtn) {
				closeBtn.appendChild(icon("x", 20));
				closeBtn.setAttribute("aria-label", "Close Panel");
			}
			statusLineEl = filterDrawer.querySelector("#bp-status-line");
		},
		setupEvents(onFilterChange) {
			if (!filterFab || !filterDrawer || !backdrop) return;
			const openDrawer = () => {
				filterDrawer.classList.add("open");
				filterFab.classList.add("active");
				backdrop.classList.add("active");
			};
			const closeAll = () => {
				filterDrawer?.classList.remove("open");
				filterFab?.classList.remove("active");
				backdrop?.classList.remove("active");
			};
			filterFab.addEventListener("click", () => {
				const isOpen = filterDrawer.classList.contains("open");
				closeAll();
				if (!isOpen) openDrawer();
			});
			backdrop.addEventListener("click", closeAll);
			filterDrawer.querySelector(".bp-close-btn")?.addEventListener("click", closeAll);
			const settingsToggle = document.getElementById("bp-drawer-settings-toggle");
			const filtersView = document.getElementById("bp-filters-view");
			const settingsView = document.getElementById("bp-settings-view");
			const drawerTitle = document.getElementById("bp-drawer-title");
			settingsToggle?.addEventListener("click", () => {
				if (settingsView?.style.display !== "none") {
					if (settingsView) settingsView.style.display = "none";
					if (filtersView) filtersView.style.display = "block";
					if (drawerTitle) drawerTitle.textContent = "Babepedia Filter";
					settingsToggle.title = "Settings";
					settingsToggle.setAttribute("aria-label", "Settings");
					settingsToggle.textContent = "";
					settingsToggle.appendChild(icon("settings", 20));
				} else {
					if (settingsView) settingsView.style.display = "block";
					if (filtersView) filtersView.style.display = "none";
					if (drawerTitle) drawerTitle.textContent = "Userscript Settings";
					settingsToggle.title = "Back to Filters";
					settingsToggle.setAttribute("aria-label", "Back to Filters");
					settingsToggle.textContent = "";
					settingsToggle.appendChild(icon("back", 20));
				}
			});
			[["bp-min-age", "bp-max-age"], ["bp-min-height", "bp-max-height"]].forEach(([minId, maxId]) => {
				const minEl = document.getElementById(minId);
				const maxEl = document.getElementById(maxId);
				minEl?.addEventListener("input", () => {
					if (+minEl.value > +maxEl.value) maxEl.value = minEl.value;
					this.updateLabelBubbles();
				});
				maxEl?.addEventListener("input", () => {
					if (+maxEl.value < +minEl.value) minEl.value = maxEl.value;
					this.updateLabelBubbles();
				});
			});
			const commitFilters = (debounce = false) => {
				this.saveFiltersToCache(debounce);
				onFilterChange();
			};
			[
				"bp-min-age",
				"bp-max-age",
				"bp-min-height",
				"bp-max-height",
				"bp-min-rating"
			].forEach((id) => {
				document.getElementById(id)?.addEventListener("input", () => {
					this.updateLabelBubbles();
					commitFilters(true);
				});
			});
			document.getElementById("bp-search")?.addEventListener("input", () => {
				if (searchDebounce) clearTimeout(searchDebounce);
				searchDebounce = setTimeout(() => {
					commitFilters(false);
				}, 200);
			});
			document.getElementById("bp-min-favs")?.addEventListener("change", () => {
				commitFilters(false);
			});
			this.setupSegmented("#bp-boobs-segment", commitFilters);
			this.setupSegmented("#bp-profession-segment", commitFilters);
			[
				"bp-sett-age",
				"bp-sett-cup-boobs",
				"bp-sett-country"
			].forEach((id) => {
				document.getElementById(id)?.addEventListener("change", () => {
					const badgeSettings = {
						showAge: document.getElementById("bp-sett-age").checked,
						showCupBoobs: document.getElementById("bp-sett-cup-boobs").checked,
						showCountry: document.getElementById("bp-sett-country").checked
					};
					Cache.setBadgeSettings(badgeSettings);
					onFilterChange();
				});
			});
			document.getElementById("bp-export-btn")?.addEventListener("click", () => {
				try {
					const jsonString = Cache.exportData();
					const blob = new Blob([jsonString], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = `bpedia-filter-backup.json`;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				} catch (err) {
					alert("Failed to export data: " + err);
				}
			});
			const importFileEl = document.getElementById("bp-import-file");
			document.getElementById("bp-import-btn")?.addEventListener("click", () => {
				importFileEl?.click();
			});
			importFileEl?.addEventListener("change", (e) => {
				const file = e.target.files?.[0];
				if (!file) return;
				if (file.size > 10485760) {
					alert("Selected backup file is too large. Limit is 10 MB.");
					return;
				}
				const reader = new FileReader();
				reader.onload = (event) => {
					const content = event.target?.result;
					if (Cache.importData(content)) {
						alert("Data imported successfully! Reloading page...");
						location.reload();
					} else alert("Failed to import data. Please check if the file format is valid.");
				};
				reader.readAsText(file);
			});
			document.getElementById("bp-reset-filters-btn")?.addEventListener("click", () => {
				this.resetFilters(onFilterChange);
			});
			document.getElementById("bp-clear-profiles-btn")?.addEventListener("click", () => {
				if (confirm("Clear all cached performer profiles? They will be re-scraped on next visit.")) {
					Cache.clearAllProfiles();
					location.reload();
				}
			});
			document.getElementById("bp-clear-all-btn")?.addEventListener("click", () => {
				if (confirm("Clear ALL data (profiles + settings)? This cannot be undone.")) {
					Cache.clearEverything();
					location.reload();
				}
			});
		},
		setupSegmented(selector, commitFilters) {
			const btns = document.querySelectorAll(`${selector} .bp-segmented-btn`);
			btns.forEach((btn) => {
				btn.addEventListener("click", () => {
					btns.forEach((b) => {
						b.classList.remove("active");
						b.setAttribute("aria-checked", "false");
					});
					btn.classList.add("active");
					btn.setAttribute("aria-checked", "true");
					commitFilters(false);
				});
			});
		},
		resetFilters(onFilterChange) {
			setVal("bp-search", "");
			setVal("bp-min-age", "18");
			setVal("bp-max-age", "70");
			setVal("bp-min-height", "130");
			setVal("bp-max-height", "220");
			setVal("bp-min-rating", "0");
			setVal("bp-min-favs", "");
			["#bp-boobs-segment", "#bp-profession-segment"].forEach((segId) => {
				document.querySelectorAll(`${segId} .bp-segmented-btn`).forEach((btn, i) => {
					btn.classList.toggle("active", i === 0);
					btn.setAttribute("aria-checked", i === 0 ? "true" : "false");
				});
			});
			document.querySelectorAll(".bp-tag-container .bp-tag.active").forEach((tag) => {
				tag.classList.remove("active");
				tag.setAttribute("aria-checked", "false");
			});
			this.updateLabelBubbles();
			this.saveFiltersToCache(false);
			onFilterChange();
		},
		updateLabelBubbles() {
			const set = (lblId, text) => {
				const el = document.getElementById(lblId);
				if (el) el.textContent = text;
			};
			set("bp-lbl-min-age", getVal("bp-min-age"));
			set("bp-lbl-max-age", getVal("bp-max-age"));
			set("bp-lbl-min-height", `${getVal("bp-min-height")} cm`);
			set("bp-lbl-max-height", `${getVal("bp-max-height")} cm`);
			set("bp-lbl-min-rating", parseFloat(getVal("bp-min-rating")).toFixed(1));
		},
		applySettingsUI() {
			const f = Cache.getFilterSettings();
			const b = Cache.getBadgeSettings();
			setVal("bp-search", f.searchQuery);
			setVal("bp-min-age", f.minAge);
			setVal("bp-max-age", f.maxAge);
			setVal("bp-min-height", f.minHeight);
			setVal("bp-max-height", f.maxHeight);
			setVal("bp-min-rating", f.minRating);
			setVal("bp-min-favs", f.minFavorites || "");
			this.setSegmented("#bp-boobs-segment", f.boobs);
			this.setSegmented("#bp-profession-segment", f.professionFilter);
			const setChk = (id, val) => {
				const el = document.getElementById(id);
				if (el) el.checked = val;
			};
			setChk("bp-sett-age", b.showAge);
			setChk("bp-sett-cup-boobs", b.showCupBoobs);
			setChk("bp-sett-country", b.showCountry);
			this.updateLabelBubbles();
		},
		setSegmented(selector, activeVal) {
			document.querySelectorAll(`${selector} .bp-segmented-btn`).forEach((btn) => {
				const isActive = btn.getAttribute("data-val") === activeVal;
				btn.classList.toggle("active", isActive);
				btn.setAttribute("aria-checked", isActive ? "true" : "false");
			});
		},
		populateDynamicTags(profiles) {
			const activeFilters = Cache.getFilterSettings();
			const newEth = new Set();
			const newHair = new Set();
			const newEyes = new Set();
			const newCups = new Set();
			const newPerfs = new Set();
			profiles.forEach((p) => {
				if (p.personal.ethnicity && !knownEthnicities.has(p.personal.ethnicity)) newEth.add(p.personal.ethnicity);
				if (p.body.hairColor && !knownHairColors.has(p.body.hairColor)) newHair.add(p.body.hairColor);
				if (p.body.eyeColor && !knownEyeColors.has(p.body.eyeColor)) newEyes.add(p.body.eyeColor);
				if (p.body.cup && !knownCups.has(p.body.cup)) newCups.add(p.body.cup);
				p.performances.solo.forEach((a) => {
					if (a && !knownPerformances.has(a)) newPerfs.add(a);
				});
				p.performances.girlGirl.forEach((a) => {
					if (a && !knownPerformances.has(a)) newPerfs.add(a);
				});
				p.performances.boyGirl.forEach((a) => {
					if (a && !knownPerformances.has(a)) newPerfs.add(a);
				});
			});
			activeFilters.ethnicities.forEach((v) => {
				if (v && !knownEthnicities.has(v)) newEth.add(v);
			});
			activeFilters.hairColors.forEach((v) => {
				if (v && !knownHairColors.has(v)) newHair.add(v);
			});
			activeFilters.eyeColors.forEach((v) => {
				if (v && !knownEyeColors.has(v)) newEyes.add(v);
			});
			activeFilters.cupSizes.forEach((v) => {
				if (v && !knownCups.has(v)) newCups.add(v);
			});
			activeFilters.performances.forEach((v) => {
				if (v && !knownPerformances.has(v)) newPerfs.add(v);
			});
			this.appendTags("bp-ethnicities-container", newEth, knownEthnicities, activeFilters.ethnicities);
			this.appendTags("bp-hair-container", newHair, knownHairColors, activeFilters.hairColors);
			this.appendTags("bp-eyes-container", newEyes, knownEyeColors, activeFilters.eyeColors);
			this.appendTags("bp-cups-container", newCups, knownCups, activeFilters.cupSizes);
			this.appendTags("bp-performances-container", newPerfs, knownPerformances, activeFilters.performances);
		},
		appendTags(containerId, newValues, tracker, activeList) {
			if (newValues.size === 0) return;
			const container = document.getElementById(containerId);
			if (!container) return;
			Array.from(newValues).sort().forEach((val) => {
				tracker.add(val);
				const tag = document.createElement("button");
				tag.type = "button";
				const isActive = activeList.includes(val);
				tag.className = `bp-tag ${isActive ? "active" : ""}`;
				tag.textContent = val;
				tag.setAttribute("role", "checkbox");
				tag.setAttribute("aria-checked", isActive ? "true" : "false");
				tag.addEventListener("click", () => {
					const nowActive = tag.classList.toggle("active");
					tag.setAttribute("aria-checked", nowActive ? "true" : "false");
					this.saveFiltersToCache(false);
					this.applyFiltersToPage(this._lastProfiles);
				});
				container.appendChild(tag);
			});
		},
		_lastProfiles: null,
		saveFiltersToCache(debounce = false) {
			const activeBtn = (segId) => document.querySelector(`${segId} .bp-segmented-btn.active`)?.getAttribute("data-val") || "all";
			const settings = {
				searchQuery: getVal("bp-search"),
				minAge: parseInt(getVal("bp-min-age"), 10) || 18,
				maxAge: parseInt(getVal("bp-max-age"), 10) || 70,
				minHeight: parseInt(getVal("bp-min-height"), 10) || 130,
				maxHeight: parseInt(getVal("bp-max-height"), 10) || 220,
				minRating: parseFloat(getVal("bp-min-rating")) || 0,
				minFavorites: parseInt(getVal("bp-min-favs"), 10) || 0,
				boobs: activeBtn("#bp-boobs-segment"),
				professionFilter: activeBtn("#bp-profession-segment"),
				ethnicities: activeTags("bp-ethnicities-container"),
				hairColors: activeTags("bp-hair-container"),
				eyeColors: activeTags("bp-eyes-container"),
				cupSizes: activeTags("bp-cups-container"),
				performances: activeTags("bp-performances-container")
			};
			Cache.setFilterSettings(settings, debounce);
		},
		applyFiltersToPage(cachedProfiles) {
			this._lastProfiles = cachedProfiles;
			const filters = Cache.getFilterSettings();
			const badgeSettings = Cache.getBadgeSettings();
			const hideAll = !badgeSettings.showAge && !badgeSettings.showCupBoobs && !badgeSettings.showCountry;
			document.body.classList.toggle("bp-hide-badges", hideAll);
			document.body.classList.toggle("bp-hide-age", !badgeSettings.showAge);
			document.body.classList.toggle("bp-hide-cup-boobs", !badgeSettings.showCupBoobs);
			document.body.classList.toggle("bp-hide-country", !badgeSettings.showCountry);
			const thumbshots = document.querySelectorAll(".thumbshot");
			let matchCount = 0;
			let totalCount = 0;
			const activeFilterCount = this.getActiveFiltersCount(filters);
			const inRange = (val, min, max, active) => !active || val !== null && val >= min && val <= max;
			thumbshots.forEach((thumb) => {
				const el = thumb;
				if (el.closest("aside, .sidebar") || el.classList.contains("menuthumb") || el.classList.contains("thumbshotsmall")) return;
				const anchor = el.querySelector("a[href*=\"/babe/\"]") || el.querySelector("a");
				if (!anchor) return;
				const rawUrl = anchor.getAttribute("href");
				if (!rawUrl) return;
				const slug = el.getAttribute("data-bp-slug") || cleanUrl(rawUrl);
				if (!slug) return;
				totalCount++;
				const profile = cachedProfiles.get(slug);
				if (!profile) {
					el.style.opacity = "0.5";
					if (filters.searchQuery) {
						const cleanName = el.getAttribute("data-bp-name") || extractPerformerName(el, anchor);
						el.style.display = cleanName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ? "" : "none";
					} else el.style.display = "";
					if (el.style.display !== "none") matchCount++;
					return;
				}
				el.style.opacity = "";
				Badges.render(el, profile);
				const q = filters.searchQuery.toLowerCase();
				const isPornstar = profile.personal.professions.some((p) => /porn|adult\s*(film|movie|actress|star)/i.test(p));
				const allActs = [
					...profile.performances.solo,
					...profile.performances.girlGirl,
					...profile.performances.boyGirl
				];
				const matches = !!((!q || profile.name.toLowerCase().includes(q)) && (filters.professionFilter === "all" || (filters.professionFilter === "pornstar" ? isPornstar : !isPornstar)) && inRange(profile.personal.age, filters.minAge, filters.maxAge, filters.minAge > 18 || filters.maxAge < 70) && inRange(profile.body.heightCm, filters.minHeight, filters.maxHeight, filters.minHeight > 130 || filters.maxHeight < 220) && (filters.minRating === 0 || profile.rating.score !== null && profile.rating.score >= filters.minRating) && (filters.minFavorites === 0 || profile.rating.favorites !== null && profile.rating.favorites >= filters.minFavorites) && (filters.boobs === "all" || profile.body.boobs === (filters.boobs === "natural" ? "Natural" : "Implants")) && (!filters.ethnicities.length || !!profile.personal.ethnicity && filters.ethnicities.includes(profile.personal.ethnicity)) && (!filters.hairColors.length || !!profile.body.hairColor && filters.hairColors.includes(profile.body.hairColor)) && (!filters.eyeColors.length || !!profile.body.eyeColor && filters.eyeColors.includes(profile.body.eyeColor)) && (!filters.cupSizes.length || !!profile.body.cup && filters.cupSizes.includes(profile.body.cup)) && (!filters.performances.length || filters.performances.every((act) => allActs.includes(act))));
				el.style.display = matches ? "" : "none";
				if (matches) matchCount++;
			});
			this.updateStatusLine(matchCount, totalCount, activeFilterCount > 0);
			this.updateFabBadge(activeFilterCount);
		},
		updateStatusLine(matchCount, totalCount, isFiltering) {
			if (!statusLineEl) return;
			if (isFiltering) {
				statusLineEl.style.display = "block";
				statusLineEl.textContent = `Showing ${matchCount} of ${totalCount}`;
			} else statusLineEl.style.display = "none";
		},
		updateFabBadge(activeFilterCount) {
			if (!activeFiltersCountEl) return;
			if (activeFilterCount > 0) {
				activeFiltersCountEl.style.display = "flex";
				activeFiltersCountEl.textContent = String(activeFilterCount);
			} else activeFiltersCountEl.style.display = "none";
		},
		getActiveFiltersCount(f) {
			return [
				!!f.searchQuery,
				f.minAge > 18 || f.maxAge < 70,
				f.minHeight > 130 || f.maxHeight < 220,
				f.minRating > 0,
				f.minFavorites > 0,
				f.boobs !== "all",
				f.professionFilter !== "all",
				f.ethnicities.length > 0,
				f.hairColors.length > 0,
				f.eyeColors.length > 0,
				f.cupSizes.length > 0,
				f.performances.length > 0
			].filter(Boolean).length;
		}
	};
	var pageProfiles = new Map();
	var scrapeQueue = [];
	var queuedUrls = new Set();
	var isScraping = false;
	var totalToScrape = 0;
	var scrapedCount = 0;
	var CONCURRENCY = 3;
	var activeCount = 0;
	var DISPATCH_GAP_MS = 150;
	var nextDispatchAt = 0;
	var consecutiveFailures = 0;
	var cooldownUntil = 0;
	var cooldownTimer = null;
	var MAX_RETRIES = 3;
	var itemRetries = new Map();
	function coalesce(run) {
		let pending = 0;
		return () => {
			if (pending) return;
			pending = requestAnimationFrame(() => {
				pending = 0;
				run();
			});
		};
	}
	var scheduleFilterApply = coalesce(() => {
		FilterPanel.applyFiltersToPage(pageProfiles);
	});
	var scheduleTagRefresh = coalesce(() => {
		FilterPanel.populateDynamicTags(pageProfiles);
		scheduleFilterApply();
	});
	function isSidebarThumb(thumb) {
		return !!thumb.closest("aside, .sidebar, .menuthumb") || thumb.classList.contains("menuthumb") || thumb.classList.contains("thumbshotsmall");
	}
	function findBabeAnchor(thumb) {
		return thumb.querySelector("a[href*=\"/babe/\"]") || thumb.querySelector("a");
	}
	function main() {
		Cache.initDbCache();
		if (/^\/babe\/[^/]+$/i.test(window.location.pathname)) return;
		const thumbs = Array.from(document.querySelectorAll(".thumbshot")).filter((t) => !isSidebarThumb(t));
		if (thumbs.length === 0) {
			setupAutoPagerObserver();
			return;
		}
		FilterPanel.init(() => {
			FilterPanel.applyFiltersToPage(pageProfiles);
		});
		ProgressBar.init();
		thumbs.forEach((thumb) => {
			processThumbshot(thumb);
		});
		startQueueProcessor();
		FilterPanel.populateDynamicTags(pageProfiles);
		FilterPanel.applyFiltersToPage(pageProfiles);
		setupAutoPagerObserver();
		window.addEventListener("pagehide", () => {
			Cache.flushFilterSettings();
		});
	}
	function processThumbshot(thumb) {
		if (isSidebarThumb(thumb)) return;
		const anchor = findBabeAnchor(thumb);
		if (!anchor) return;
		const rawUrl = anchor.getAttribute("href");
		if (!rawUrl) return;
		const slug = cleanUrl(rawUrl);
		if (!slug || !rawUrl.includes("/babe/") && !/^[a-zA-Z0-9_.-]+$/.test(rawUrl)) return;
		const name = extractPerformerName(thumb, anchor);
		thumb.setAttribute("data-bp-name", name);
		thumb.setAttribute("data-bp-slug", slug);
		const cached = Cache.getProfile(slug);
		if (cached) pageProfiles.set(slug, cached);
		else enqueueThumb(slug, name);
	}
	function enqueueThumb(slug, name) {
		if (queuedUrls.has(slug)) return;
		queuedUrls.add(slug);
		scrapeQueue.push({
			url: slug,
			name
		});
		totalToScrape++;
		if (isScraping) ProgressBar.update(scrapedCount, totalToScrape);
	}
	function startQueueProcessor() {
		if (isScraping || scrapeQueue.length === 0) return;
		isScraping = true;
		ProgressBar.show();
		ProgressBar.update(scrapedCount, totalToScrape);
		pumpQueue();
	}
	function handleRetryable(item, errorMsg) {
		consecutiveFailures++;
		console.warn(errorMsg);
		cooldownUntil = Date.now() + Math.min(1e4, consecutiveFailures * 2e3);
		const slug = cleanUrl(item.url);
		const retries = itemRetries.get(slug) || 0;
		if (retries < MAX_RETRIES) {
			itemRetries.set(slug, retries + 1);
			scrapeQueue.push(item);
		} else {
			console.error(`[BP] Max retries reached for ${item.name}. Skipping.`);
			itemRetries.delete(slug);
			queuedUrls.delete(slug);
			scrapedCount++;
			ProgressBar.update(scrapedCount, totalToScrape);
		}
	}
	function handleTerminal(item, errorMsg) {
		console.warn(errorMsg);
		const slug = cleanUrl(item.url);
		queuedUrls.delete(slug);
		itemRetries.delete(slug);
		scrapedCount++;
		ProgressBar.update(scrapedCount, totalToScrape);
	}
	function pumpQueue() {
		if (!isScraping) return;
		const now = Date.now();
		if (now < cooldownUntil) {
			if (!cooldownTimer) cooldownTimer = setTimeout(() => {
				cooldownTimer = null;
				if (isScraping) pumpQueue();
			}, cooldownUntil - now);
			return;
		}
		while (activeCount < CONCURRENCY && scrapeQueue.length > 0) {
			const item = scrapeQueue.shift();
			if (!item) break;
			const slug = cleanUrl(item.url);
			const cached = Cache.getProfile(slug);
			if (cached) {
				queuedUrls.delete(slug);
				pageProfiles.set(slug, cached);
				scrapedCount++;
				ProgressBar.update(scrapedCount, totalToScrape);
				scheduleFilterApply();
				continue;
			}
			activeCount++;
			const delay = Math.max(0, nextDispatchAt - Date.now());
			nextDispatchAt = Date.now() + delay + DISPATCH_GAP_MS;
			setTimeout(() => {
				try {
					dispatchItem(item);
				} catch (e) {
					activeCount--;
					handleRetryable(item, `[BP] Dispatch failed for ${item.name}: ${e}`);
					pumpQueue();
				}
			}, delay);
		}
		if (scrapeQueue.length === 0 && activeCount === 0) {
			isScraping = false;
			ProgressBar.hide();
			scheduleTagRefresh();
		}
	}
	function requestProfile(targetUrl) {
		if (typeof _GM_xmlhttpRequest === "function") return new Promise((resolve, reject) => {
			_GM_xmlhttpRequest({
				method: "GET",
				url: targetUrl,
				timeout: 3e4,
				headers: {
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": navigator.language || "en-US,en;q=0.9",
					"Cache-Control": "no-cache"
				},
				onload: (res) => resolve({
					status: res.status,
					responseText: res.responseText
				}),
				onerror: (err) => reject(new Error(String(err))),
				ontimeout: () => reject(new Error("Timeout after 30s"))
			});
		});
		return fetch(targetUrl, {
			credentials: "same-origin",
			headers: { "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
		}).then(async (res) => ({
			status: res.status,
			responseText: await res.text()
		}));
	}
	function dispatchItem(item) {
		const slug = cleanUrl(item.url);
		requestProfile(`https://www.babepedia.com/babe/${slug}`).then(({ status, responseText }) => {
			activeCount--;
			if (status === 200) try {
				const profile = parseProfileHtml(responseText, `/babe/${slug}`, item.name);
				Cache.setProfile(slug, profile);
				pageProfiles.set(slug, profile);
				consecutiveFailures = 0;
				cooldownUntil = 0;
				itemRetries.delete(slug);
				queuedUrls.delete(slug);
				scrapedCount++;
				ProgressBar.update(scrapedCount, totalToScrape);
				scheduleTagRefresh();
			} catch (e) {
				handleRetryable(item, `[BP] Parse error / verification failed for ${item.name}: ${e}`);
			}
			else if (status === 429 || status === 503 || status === 403) handleRetryable(item, `[BP] Rate limited or blocked (${status}) for ${item.name}.`);
			else handleTerminal(item, `[BP] Fetch failed for ${item.name}: ${status}`);
			pumpQueue();
		}).catch((err) => {
			activeCount--;
			handleRetryable(item, `[BP] Request failed for ${item.name}: ${err}`);
			pumpQueue();
		});
	}
	function setupAutoPagerObserver() {
		const target = document.getElementById("content") || document.body;
		if (!target) return;
		new MutationObserver((mutations) => {
			let added = false;
			for (const mutation of mutations) for (const node of Array.from(mutation.addedNodes)) {
				if (node.nodeType !== Node.ELEMENT_NODE) continue;
				const el = node;
				if (el.classList.contains("thumbshot")) {
					processThumbshot(el);
					added = true;
				} else el.querySelectorAll(".thumbshot").forEach((inner) => {
					processThumbshot(inner);
					added = true;
				});
			}
			if (added) {
				scheduleFilterApply();
				if (scrapeQueue.length > 0) {
					if (!isScraping) {
						isScraping = true;
						ProgressBar.show();
					}
					ProgressBar.update(scrapedCount, totalToScrape);
					pumpQueue();
				}
			}
		}).observe(target, {
			childList: true,
			subtree: true
		});
	}
	main();
})();
