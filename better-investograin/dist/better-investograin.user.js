// ==UserScript==
// @name         Better InvestorGain
// @namespace    https://github.com/quantavil/userscript/
// @version      1.2.0
// @author       quantavil
// @description  Hides ads, broker affiliate promo bars, sponsor strips, and partner footer sections on InvestorGain.com — keeping only the IPO data you care about.
// @license      GPL-3.0-or-later
// @match        *://*.investorgain.com/*
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var CSS = `
/* ── Broker affiliate bar below header ─────────────────────────────────── */
.tlu-wrap                    { display: none !important; }

/* ── Broker promo cards inside nav mega-menu ───────────────────────────── */
.nmm-promo-strip             { display: none !important; }

/* ── Ad blocks / placeholders (site-wide) ──────────────────────────────── */
.ad-block,
.ad-placeholder,
.ad-ph-inner,
[class*="ad-970"],
[class*="ad-300"]            { display: none !important; }

/* ── Footer: full footer removal ───────────────────────────────────────── */
footer.site-footer,
.site-footer,
.adv-strip,
.ft-partners                 { display: none !important; }

/* ── Homepage: broker carousel & compare sections ──────────────────────── */
.broker-carousel-section,
.compare-section             { display: none !important; }

/* ── Sidebars: homepage, IPO detail & report pages ─────────────────────── */
/* Hides "Top Brokers", "Quick Links", "SME IPO Enquiry", "Open Demat" etc. */
aside.sidebar,
.sidebar,
aside.detail-side,
.detail-side,
aside.report-sidebar,
.report-sidebar,
.invest-cta,
.broker-cta-card             { display: none !important; }

/* ── IPO Detail & Report Pages: in-content affiliate ads & banners ──────── */
/* Hides "🚀 Apply for IPOs Online – Free Demat Account" banner */
.ipo-apply-section,
#ipoApplySection,
/* Hides Zerodha/AngelOne "Open Free Account →" cards inside details tables */
tr.ad-tr,
td.ad,
.ndrop-broker-card,
.nmm-ad-card,
.nmm-ad-img,
.mob-broker-list,
#stock-brokers-section,
#findYourBroker,
.find-your-broker-navbar     { display: none !important; }

/* ── Layout fixes: expand main content to full width ───────────────────── */
/* Collapse homepage grid from 2 columns (815px 280px) to full width */
.main-grid                   { grid-template-columns: 1fr !important; }

/* Collapse IPO detail page grid from 2 columns (975px 300px) to full width */
.detail-grid                 { grid-template-columns: 1fr !important; }
.detail-main                 { width: 100% !important; max-width: 100% !important; }

/* Collapse report page grid (GMP live, subscription, allotment) to full width */
.report-grid                 { grid-template-columns: 1fr !important; }


/* ── Table fix: TR gradients end in white — dark mode bug ──────────────── */
/* Site CSS sets background: linear-gradient(90deg, <dark-color> 0%,        */
/* rgb(255,255,255) 100%) on each TR. In light mode the white end           */
/* is invisible. In dark mode it covers the PRICE BAND / PERIOD cols.       */
/* Removing background-image lets the correct dark background-color         */
/* (already set by the site's own dark mode CSS) show through.              */
[data-theme="dark"] .gmp-table-creative tr { background-image: none !important; }


/* ── Section Dividers for Smart Relevance Sort (Table & Grid) ───────────── */
.big-section-divider td {
  padding: 10px 16px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.2px;
  border-top: 1px solid #e2e8f0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.big-grid-divider {
  grid-column: 1 / -1 !important;
  width: 100% !important;
  padding: 10px 16px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  margin: 10px 0 4px 0 !important;
  border: 1px solid #e2e8f0 !important;
  box-sizing: border-box !important;
}

.big-divider-open,
.big-divider-open td {
  background: #ecfdf5 !important;
  color: #065f46 !important;
  border-color: #a7f3d0 !important;
}

.big-divider-upcoming,
.big-divider-upcoming td {
  background: #fffbeb !important;
  color: #92400e !important;
  border-color: #fde68a !important;
}

.big-divider-closed,
.big-divider-closed td {
  background: #f8fafc !important;
  color: #475569 !important;
  border-color: #e2e8f0 !important;
}

[data-theme="dark"] .big-section-divider td,
[data-theme="dark"] .big-grid-divider {
  border-color: #1e293b !important;
}

[data-theme="dark"] .big-divider-open,
[data-theme="dark"] .big-divider-open td {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #6ee7b7 !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

[data-theme="dark"] .big-divider-upcoming,
[data-theme="dark"] .big-divider-upcoming td {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #fcd34d !important;
  border-color: rgba(245, 158, 11, 0.3) !important;
}

[data-theme="dark"] .big-divider-closed,
[data-theme="dark"] .big-divider-closed td {
  background: rgba(100, 116, 139, 0.15) !important;
  color: #94a3b8 !important;
  border-color: rgba(100, 116, 139, 0.3) !important;
}
`;
	function injectStyles() {
		const style = document.createElement("style");
		style.id = "better-ig-styles";
		style.textContent = CSS;
		(document.head ?? document.documentElement)?.prepend(style);
	}
	var MONTHS = {
		jan: 0,
		january: 0,
		feb: 1,
		february: 1,
		mar: 2,
		march: 2,
		apr: 3,
		april: 3,
		may: 4,
		jun: 5,
		june: 5,
		jul: 6,
		july: 6,
		aug: 7,
		august: 7,
		sep: 8,
		sept: 8,
		september: 8,
		oct: 9,
		october: 9,
		nov: 10,
		november: 10,
		dec: 11,
		december: 11
	};
	var isSorting = false;
	function toTimestamp(day, monStr, yearVal) {
		const cleanMon = monStr.toLowerCase().replace(/[^a-z]/g, "");
		const m = MONTHS[cleanMon] ?? MONTHS[cleanMon.slice(0, 3)];
		if (m === void 0 || isNaN(day) || day < 1 || day > 31) return NaN;
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		let finalYear = currentYear;
		if (yearVal !== void 0 && !isNaN(yearVal)) finalYear = yearVal < 100 ? 2e3 + yearVal : yearVal;
		else if (m - currentMonth < -6) finalYear = currentYear + 1;
		else if (m - currentMonth > 6) finalYear = currentYear - 1;
		return new Date(finalYear, m, day).getTime();
	}
	function parseDate(str) {
		if (!str) return NaN;
		const s = str.trim();
		const mDayFirst = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?\b/i);
		if (mDayFirst) {
			const day = parseInt(mDayFirst[1], 10);
			const mon = mDayFirst[2];
			const ts = toTimestamp(day, mon, mDayFirst[3] ? parseInt(mDayFirst[3], 10) : void 0);
			if (!isNaN(ts)) return ts;
		}
		const mMonFirst = s.match(/\b([A-Za-z]{3,9})\s*[-/.\s]?\s*(\d{1,2})(?:st|nd|rd|th)?(?:[,\s'-]*(\d{2,4}))?\b/i);
		if (mMonFirst) {
			const mon = mMonFirst[1];
			const ts = toTimestamp(parseInt(mMonFirst[2], 10), mon, mMonFirst[3] ? parseInt(mMonFirst[3], 10) : void 0);
			if (!isNaN(ts)) return ts;
		}
		const mIso = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
		if (mIso) return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
		const mNumDmy = s.match(/\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/);
		if (mNumDmy) {
			const day = parseInt(mNumDmy[1], 10);
			const mon = parseInt(mNumDmy[2], 10) - 1;
			const year = mNumDmy[3] ? parseInt(mNumDmy[3], 10) : new Date().getFullYear();
			const finalYear = year < 100 ? 2e3 + year : year;
			return new Date(finalYear, mon, day).getTime();
		}
		return NaN;
	}
	function parsePeriod(periodStr) {
		if (!periodStr) return {
			open: NaN,
			close: NaN
		};
		const s = periodStr.trim();
		const crossMonth = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?/i);
		if (crossMonth) {
			const openDay = parseInt(crossMonth[1], 10);
			const openMon = crossMonth[2];
			const openYear = crossMonth[3] ? parseInt(crossMonth[3], 10) : void 0;
			const closeDay = parseInt(crossMonth[4], 10);
			const closeMon = crossMonth[5];
			const closeYear = crossMonth[6] ? parseInt(crossMonth[6], 10) : openYear;
			return {
				open: toTimestamp(openDay, openMon, openYear),
				close: toTimestamp(closeDay, closeMon, closeYear)
			};
		}
		const sameMonth = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?/i);
		if (sameMonth) {
			const openDay = parseInt(sameMonth[1], 10);
			const closeDay = parseInt(sameMonth[2], 10);
			const mon = sameMonth[3];
			const year = sameMonth[4] ? parseInt(sameMonth[4], 10) : void 0;
			return {
				open: toTimestamp(openDay, mon, year),
				close: toTimestamp(closeDay, mon, year)
			};
		}
		const monFirstRange = s.match(/([A-Za-z]{3,9})\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(?:([A-Za-z]{3,9})\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:[,\s'-]*(\d{2,4}))?/i);
		if (monFirstRange) {
			const openMon = monFirstRange[1];
			const openDay = parseInt(monFirstRange[2], 10);
			const closeMon = monFirstRange[3] || openMon;
			const closeDay = parseInt(monFirstRange[4], 10);
			const year = monFirstRange[5] ? parseInt(monFirstRange[5], 10) : void 0;
			return {
				open: toTimestamp(openDay, openMon, year),
				close: toTimestamp(closeDay, closeMon, year)
			};
		}
		const singleDate = parseDate(s);
		if (!isNaN(singleDate)) return {
			open: singleDate,
			close: singleDate
		};
		return {
			open: NaN,
			close: NaN
		};
	}
	function getStatusFromText(text, openTs, closeTs) {
		const t = text.trim().toUpperCase();
		if (/\bUPCOMING\b|\bOPENING\b|\bOPENS\s+TODAY\b|\bPRE-IPO\b|IPOU|SMEU|MAINBOARDUPCOMING|SMEUPCOMING|\bU\b/.test(t)) return "UPCOMING";
		if (/\bOPEN\b|\bACTIVE\b|\bCLOSING\s+TODAY\b|\bCLOSES\s+TODAY\b|\bAPPLY\s+NOW\b|IPOO|SMEO|MAINBOARDOPEN|SMEOPEN|\bO\b/.test(t)) return "OPEN";
		if (/\bCLOSED?\b|\bLISTED\b|\bALLOTMENT\b|IPOC|SMEC|MAINBOARDCLOSED|SMECLOSED|\bC\b/.test(t)) return "CLOSED";
		if (openTs !== void 0 || closeTs !== void 0) {
			const now = Date.now();
			const open = openTs ?? NaN;
			const close = closeTs ?? NaN;
			const closeEndOfDay = !isNaN(close) ? close + 864e5 - 1 : NaN;
			if (!isNaN(open) && now < open) return "UPCOMING";
			if (!isNaN(closeEndOfDay) && now > closeEndOfDay) return "CLOSED";
			if (!isNaN(open) && !isNaN(closeEndOfDay) && now >= open && now <= closeEndOfDay) return "OPEN";
		}
		return "CLOSED";
	}
	function getRowStatus(tr, openTs, closeTs) {
		const statusEl = tr.querySelector(".ipo-status, [class*=\"status\"], [class*=\"badge\"], .tag, .pill");
		if (statusEl?.textContent) {
			const st = getStatusFromText(statusEl.textContent, openTs, closeTs);
			if (st) return st;
		}
		const firstCellText = tr.querySelector("td:first-child")?.textContent ?? "";
		if (firstCellText) {
			const st = getStatusFromText(firstCellText, openTs, closeTs);
			if (st) return st;
		}
		return getStatusFromText(tr.innerText, openTs, closeTs);
	}
	function getCardStatus(card, openTs, closeTs) {
		const statusEl = card.querySelector(".ipo-status, [class*=\"status\"], [class*=\"badge\"], .tag, .pill, .ipo-card-header, .ipo-card-status");
		if (statusEl?.textContent) {
			const st = getStatusFromText(statusEl.textContent, openTs, closeTs);
			if (st) return st;
		}
		const titleEl = card.querySelector(".ipo-card-name, .ipo-card-title, h3, h4, .ipo-name");
		return getStatusFromText((card.querySelector(".ipo-card-body")?.textContent ?? card.textContent ?? "").replace(titleEl?.textContent ?? "", ""), openTs, closeTs);
	}
	var sortAsc = (a, b) => (isNaN(a) ? Infinity : a) - (isNaN(b) ? Infinity : b) || 0;
	var sortDesc = (a, b) => (isNaN(b) ? -Infinity : b) - (isNaN(a) ? -Infinity : a) || 0;
	function bucketAndSort(items) {
		const open = [];
		const upcoming = [];
		const closed = [];
		for (const item of items) if (item.status === "OPEN") open.push(item);
		else if (item.status === "UPCOMING") upcoming.push(item);
		else closed.push(item);
		open.sort((a, b) => sortAsc(a.close, b.close) || sortAsc(a.open, b.open));
		upcoming.sort((a, b) => sortAsc(a.open, b.open) || sortAsc(a.close, b.close));
		closed.sort((a, b) => sortDesc(a.close, b.close) || sortDesc(a.open, b.open));
		return {
			open,
			upcoming,
			closed
		};
	}
	var tabListenersAttached = false;
	function attachTabListeners(onTrigger = initFeatures) {
		if (tabListenersAttached) return;
		tabListenersAttached = true;
		document.addEventListener("click", (e) => {
			if (e.target.closest(".gmp-tab-pills-desktop button, .section-tabs button, .ntab, .gmp-mob-tab-btn, .table-controls button, .filter-right button, .vt-btn, .gmp-mob-vt-btn, .gmp-mob-apply-btn, .gmp-mob-clear-btn, .view-toggle button, .gmp-mob-view-toggle button, .pagination button, .page-link, .nav-pills button")) onTrigger();
		});
		document.addEventListener("change", (e) => {
			if (e.target.closest("select, .filter-select, .gmp-filter-select")) onTrigger();
		});
	}
	function sortHomepageTable() {
		const tbody = document.querySelector(".gmp-table-creative tbody");
		if (!tbody || tbody.offsetWidth === 0 && tbody.offsetHeight === 0) return;
		const rows = Array.from(tbody.querySelectorAll("tr:not(.big-section-divider)")).filter((tr) => tr.cells.length > 1 && !tr.innerText.includes("Loading"));
		if (rows.length === 0) return;
		const { open, upcoming, closed } = bucketAndSort(rows.map((tr) => {
			const dates = parsePeriod(tr.querySelector("td:last-child")?.textContent ?? "");
			return {
				element: tr,
				status: getRowStatus(tr, dates.open, dates.close),
				...dates
			};
		}));
		const thCount = tbody.closest("table")?.querySelectorAll("thead th").length ?? 0;
		const colSpan = thCount > 0 ? thCount : tbody.rows[0]?.cells.length ?? 5;
		tbody.querySelectorAll(".big-section-divider").forEach((d) => d.remove());
		appendTableSection(tbody, colSpan, "Open IPOs", "🟢", open, "big-divider-open");
		appendTableSection(tbody, colSpan, "Upcoming IPOs", "🟡", upcoming, "big-divider-upcoming");
		appendTableSection(tbody, colSpan, "Closed / Listed IPOs", "⚪", closed, "big-divider-closed");
	}
	function sortHomepageGrid() {
		const grid = document.querySelector(".gmp-cards, .ipo-cards-container");
		if (!grid || grid.offsetWidth === 0 && grid.offsetHeight === 0) return;
		const cards = Array.from(grid.querySelectorAll(".ipo-card:not(.big-grid-divider)")).filter((c) => c.innerText.trim().length > 0 && !c.classList.contains("ad-card"));
		if (cards.length === 0) return;
		const { open, upcoming, closed } = bucketAndSort(cards.map((card) => {
			const dates = parsePeriod(card.querySelector(".ipo-card-body")?.textContent ?? card.innerText);
			return {
				element: card,
				status: getCardStatus(card, dates.open, dates.close),
				...dates
			};
		}));
		grid.querySelectorAll(".big-grid-divider").forEach((d) => d.remove());
		appendGridSection(grid, "Open IPOs", "🟢", open, "big-divider-open");
		appendGridSection(grid, "Upcoming IPOs", "🟡", upcoming, "big-divider-upcoming");
		appendGridSection(grid, "Closed / Listed IPOs", "⚪", closed, "big-divider-closed");
	}
	function sortReportTable() {
		const table = document.querySelector(".report-data-table, table.report-table, .report-table-scrollwrap table, #reportTable");
		if (!table) return;
		const tbody = table.querySelector("tbody");
		if (!tbody) return;
		let openCol = -1;
		let closeCol = -1;
		let periodCol = -1;
		const ths = table.querySelectorAll("thead th");
		ths.forEach((th, idx) => {
			const t = th.innerText.toUpperCase().trim();
			if (/\b(OPEN|OPENING)\b/i.test(t) && !/\b(CLOSE|CLOSING)\b/i.test(t)) openCol = idx;
			if (/\b(CLOS(?:E|ING)|CLOSE\s*DATE|CLOSING\s*DATE)\b/i.test(t)) closeCol = idx;
			if (/\b(PERIOD|DATES?|ISSUE\s*PERIOD|ISSUE\s*DATES?)\b/i.test(t)) periodCol = idx;
		});
		const rows = Array.from(tbody.querySelectorAll("tr:not(.big-section-divider)")).filter((tr) => tr.cells.length > 1 && !tr.querySelector("th") && !tr.innerText.includes("Loading"));
		if (rows.length === 0) return;
		const { open, upcoming, closed } = bucketAndSort(rows.map((tr) => {
			const cells = tr.querySelectorAll("td");
			let open = NaN;
			let close = NaN;
			if (openCol >= 0 && cells[openCol]) open = parseDate(cells[openCol].innerText);
			if (closeCol >= 0 && cells[closeCol]) close = parseDate(cells[closeCol].innerText);
			if (isNaN(open) && isNaN(close) && periodCol >= 0 && cells[periodCol]) {
				const p = parsePeriod(cells[periodCol].innerText);
				open = p.open;
				close = p.close;
			}
			return {
				element: tr,
				status: getRowStatus(tr, open, close),
				open,
				close
			};
		}));
		tbody.querySelectorAll(".big-section-divider").forEach((d) => d.remove());
		const colCount = ths.length > 0 ? ths.length : tbody.rows[0]?.cells.length ?? 13;
		appendTableSection(tbody, colCount, "Open IPOs", "🟢", open, "big-divider-open");
		appendTableSection(tbody, colCount, "Upcoming IPOs", "🟡", upcoming, "big-divider-upcoming");
		appendTableSection(tbody, colCount, "Closed / Listed IPOs", "⚪", closed, "big-divider-closed");
	}
	function initFeatures() {
		if (isSorting) return;
		isSorting = true;
		try {
			sortHomepageTable();
			sortHomepageGrid();
			sortReportTable();
		} finally {
			queueMicrotask(() => {
				isSorting = false;
			});
		}
	}
	function appendTableSection(tbody, colSpan, title, icon, items, className) {
		if (items.length === 0) return;
		const divTr = document.createElement("tr");
		divTr.className = `big-section-divider ${className}`;
		divTr.innerHTML = `
    <td colspan="${colSpan}">
      ${icon} <strong>${title}</strong> (${items.length})
    </td>
  `;
		tbody.appendChild(divTr);
		items.forEach((item) => tbody.appendChild(item.element));
	}
	function appendGridSection(grid, title, icon, items, className) {
		if (items.length === 0) return;
		const div = document.createElement("div");
		div.className = `big-grid-divider ${className}`;
		div.innerHTML = `${icon} <strong>${title}</strong> (${items.length})`;
		grid.appendChild(div);
		items.forEach((item) => grid.appendChild(item.element));
	}
	var REORDER_DEBOUNCE_MS = 100;
	injectStyles();
	var sortDebounce = null;
	function debouncedReorder() {
		if (sortDebounce) clearTimeout(sortDebounce);
		sortDebounce = setTimeout(() => {
			initFeatures();
		}, REORDER_DEBOUNCE_MS);
	}
	var isDivider = (n) => n instanceof HTMLElement && (n.classList.contains("big-section-divider") || n.classList.contains("big-grid-divider"));
	function observeDynamicContent() {
		const target = document.body ?? document.documentElement;
		if (!target) return;
		new MutationObserver((mutations) => {
			if (isSorting) return;
			for (const m of mutations) {
				if (m.type !== "childList") continue;
				if (Array.from(m.addedNodes).some((n) => !isDivider(n)) || Array.from(m.removedNodes).some((n) => !isDivider(n))) {
					debouncedReorder();
					break;
				}
			}
		}).observe(target, {
			childList: true,
			subtree: true
		});
	}
	function startFeatures() {
		initFeatures();
		attachTabListeners(debouncedReorder);
		observeDynamicContent();
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startFeatures, { once: true });
	else startFeatures();
})();
