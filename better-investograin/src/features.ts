/**
 * Better InvestorGain — Smart Relevance Sorting & Section Dividers
 */

export interface SortItem<T extends HTMLElement> {
  element: T;
  open: number;
  close: number;
  status: 'OPEN' | 'UPCOMING' | 'CLOSED';
}


const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export let isSorting = false;

export function toTimestamp(day: number, monStr: string, yearVal?: number): number {
  const cleanMon = monStr.toLowerCase().replace(/[^a-z]/g, '');
  const m = MONTHS[cleanMon] ?? MONTHS[cleanMon.slice(0, 3)];
  if (m === undefined || isNaN(day) || day < 1 || day > 31) return NaN;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  let finalYear = currentYear;

  if (yearVal !== undefined && !isNaN(yearVal)) {
    finalYear = yearVal < 100 ? 2000 + yearVal : yearVal;
  } else {
    // Rolling 6-month window for year inference if no year is provided
    if (m - currentMonth < -6) {
      finalYear = currentYear + 1;
    } else if (m - currentMonth > 6) {
      finalYear = currentYear - 1;
    }
  }

  return new Date(finalYear, m, day).getTime();
}

export function parseDate(str?: string): number {
  if (!str) return NaN;
  const s = str.trim();

  // 1. Day-first named month: "18-Aug-2026", "18th Aug 26", "18 August 2026", "1-Sep", "22-Aug 21:55"
  const mDayFirst = s.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?\b/i
  );
  if (mDayFirst) {
    const day = parseInt(mDayFirst[1], 10);
    const mon = mDayFirst[2];
    const year = mDayFirst[3] ? parseInt(mDayFirst[3], 10) : undefined;
    const ts = toTimestamp(day, mon, year);
    if (!isNaN(ts)) return ts;
  }

  // 2. Month-first named month: "Aug 18th, 2026", "August 18, 2026", "Aug 18"
  const mMonFirst = s.match(
    /\b([A-Za-z]{3,9})\s*[-/.\s]?\s*(\d{1,2})(?:st|nd|rd|th)?(?:[,\s'-]*(\d{2,4}))?\b/i
  );
  if (mMonFirst) {
    const mon = mMonFirst[1];
    const day = parseInt(mMonFirst[2], 10);
    const year = mMonFirst[3] ? parseInt(mMonFirst[3], 10) : undefined;
    const ts = toTimestamp(day, mon, year);
    if (!isNaN(ts)) return ts;
  }

  // 3. Numeric formats: "18/08/2026", "18-08-2026", "2026-08-18"
  const mIso = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (mIso) {
    return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
  }

  const mNumDmy = s.match(/\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/);
  if (mNumDmy) {
    const day = parseInt(mNumDmy[1], 10);
    const mon = parseInt(mNumDmy[2], 10) - 1;
    const year = mNumDmy[3] ? parseInt(mNumDmy[3], 10) : new Date().getFullYear();
    const finalYear = year < 100 ? 2000 + year : year;
    return new Date(finalYear, mon, day).getTime();
  }

  return NaN;
}

export function parsePeriod(periodStr?: string): { open: number; close: number } {
  if (!periodStr) return { open: NaN, close: NaN };
  const s = periodStr.trim();

  // 1. Cross-month range: "28 Aug - 1 Sep", "28-Aug to 1-Sep", "28th Aug 2026 - 1st Sep 2026"
  const crossMonth = s.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?/i
  );
  if (crossMonth) {
    const openDay = parseInt(crossMonth[1], 10);
    const openMon = crossMonth[2];
    const openYear = crossMonth[3] ? parseInt(crossMonth[3], 10) : undefined;

    const closeDay = parseInt(crossMonth[4], 10);
    const closeMon = crossMonth[5];
    const closeYear = crossMonth[6] ? parseInt(crossMonth[6], 10) : openYear;

    return {
      open: toTimestamp(openDay, openMon, openYear),
      close: toTimestamp(closeDay, closeMon, closeYear),
    };
  }

  // 2. Same-month day range: "1 - 3 Sep", "27 - 31 Aug", "18 to 22 Aug 2026"
  const sameMonth = s.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s*[-/.\s]?\s*([A-Za-z]{3,9})(?:[,\s'-]*(\d{2,4}))?/i
  );
  if (sameMonth) {
    const openDay = parseInt(sameMonth[1], 10);
    const closeDay = parseInt(sameMonth[2], 10);
    const mon = sameMonth[3];
    const year = sameMonth[4] ? parseInt(sameMonth[4], 10) : undefined;

    return {
      open: toTimestamp(openDay, mon, year),
      close: toTimestamp(closeDay, mon, year),
    };
  }

  // 3. Month-first range: "Aug 18 - 22", "Aug 18 to 22, 2026", "Aug 28 - Sep 1, 2026"
  const monFirstRange = s.match(
    /([A-Za-z]{3,9})\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(?:([A-Za-z]{3,9})\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:[,\s'-]*(\d{2,4}))?/i
  );
  if (monFirstRange) {
    const openMon = monFirstRange[1];
    const openDay = parseInt(monFirstRange[2], 10);
    const closeMon = monFirstRange[3] || openMon;
    const closeDay = parseInt(monFirstRange[4], 10);
    const year = monFirstRange[5] ? parseInt(monFirstRange[5], 10) : undefined;

    return {
      open: toTimestamp(openDay, openMon, year),
      close: toTimestamp(closeDay, closeMon, year),
    };
  }

  // 4. Fallback: single date in the string
  const singleDate = parseDate(s);
  if (!isNaN(singleDate)) {
    return { open: singleDate, close: singleDate };
  }

  return { open: NaN, close: NaN };
}

/** Unified status classifier with exact keywords, suffixes, and timestamp fallbacks */
export function getStatusFromText(
  text: string,
  openTs?: number,
  closeTs?: number
): 'OPEN' | 'UPCOMING' | 'CLOSED' {
  const t = text.trim().toUpperCase();

  // 1. Explicit keywords / suffixes
  if (
    /\bUPCOMING\b|\bOPENING\b|\bOPENS\s+TODAY\b|\bPRE-IPO\b|IPOU|SMEU|MAINBOARDUPCOMING|SMEUPCOMING|\bU\b/.test(
      t
    )
  ) {
    return 'UPCOMING';
  }
  if (
    /\bOPEN\b|\bACTIVE\b|\bCLOSING\s+TODAY\b|\bCLOSES\s+TODAY\b|\bAPPLY\s+NOW\b|IPOO|SMEO|MAINBOARDOPEN|SMEOPEN|\bO\b/.test(
      t
    )
  ) {
    return 'OPEN';
  }
  if (
    /\bCLOSED?\b|\bLISTED\b|\bALLOTMENT\b|IPOC|SMEC|MAINBOARDCLOSED|SMECLOSED|\bC\b/.test(
      t
    )
  ) {
    return 'CLOSED';
  }

  // 2. Intelligent fallback using timestamps if text is not explicit
  if (openTs !== undefined || closeTs !== undefined) {
    const now = Date.now();
    const open = openTs ?? NaN;
    const close = closeTs ?? NaN;
    const closeEndOfDay = !isNaN(close) ? close + 86400000 - 1 : NaN;

    if (!isNaN(open) && now < open) {
      return 'UPCOMING';
    }
    if (!isNaN(closeEndOfDay) && now > closeEndOfDay) {
      return 'CLOSED';
    }
    if (!isNaN(open) && !isNaN(closeEndOfDay) && now >= open && now <= closeEndOfDay) {
      return 'OPEN';
    }
  }

  return 'CLOSED';
}

export function getRowStatus(
  tr: HTMLTableRowElement,
  openTs?: number,
  closeTs?: number
): 'OPEN' | 'UPCOMING' | 'CLOSED' {
  // Check explicit badge or status indicator element
  const statusEl = tr.querySelector('.ipo-status, [class*="status"], [class*="badge"], .tag, .pill');
  if (statusEl?.textContent) {
    const st = getStatusFromText(statusEl.textContent, openTs, closeTs);
    if (st) return st;
  }

  // Check first cell text (name + type tag, e.g. "MAINBOARDUPCOMING", "IPOU", "SMEOPEN")
  const firstCellText = tr.querySelector('td:first-child')?.textContent ?? '';
  if (firstCellText) {
    const st = getStatusFromText(firstCellText, openTs, closeTs);
    if (st) return st;
  }

  // Fallback to row text or timestamps
  return getStatusFromText(tr.innerText, openTs, closeTs);
}

export function getCardStatus(
  card: HTMLElement,
  openTs?: number,
  closeTs?: number
): 'OPEN' | 'UPCOMING' | 'CLOSED' {
  const statusEl = card.querySelector(
    '.ipo-status, [class*="status"], [class*="badge"], .tag, .pill, .ipo-card-header, .ipo-card-status'
  );
  if (statusEl?.textContent) {
    const st = getStatusFromText(statusEl.textContent, openTs, closeTs);
    if (st) return st;
  }

  const titleEl = card.querySelector('.ipo-card-name, .ipo-card-title, h3, h4, .ipo-name');
  const bodyText = (card.querySelector('.ipo-card-body')?.textContent ?? card.textContent ?? '')
    .replace(titleEl?.textContent ?? '', '');

  return getStatusFromText(bodyText, openTs, closeTs);
}

const sortAsc = (a: number, b: number): number =>
  ((isNaN(a) ? Infinity : a) - (isNaN(b) ? Infinity : b)) || 0;

const sortDesc = (a: number, b: number): number =>
  ((isNaN(b) ? -Infinity : b) - (isNaN(a) ? -Infinity : a)) || 0;

/**
 * Smart Relevance Sorting:
 * 1. Open: closing first (Close ASC), tie-break Open ASC
 * 2. Upcoming: opening next (Open ASC), tie-break Close ASC
 * 3. Closed: just ended (Close DESC), tie-break Open DESC
 */
export function bucketAndSort<T extends HTMLElement>(items: SortItem<T>[]): {
  open: SortItem<T>[];
  upcoming: SortItem<T>[];
  closed: SortItem<T>[];
} {
  const open: SortItem<T>[] = [];
  const upcoming: SortItem<T>[] = [];
  const closed: SortItem<T>[] = [];

  for (const item of items) {
    if (item.status === 'OPEN') open.push(item);
    else if (item.status === 'UPCOMING') upcoming.push(item);
    else closed.push(item);
  }

  open.sort((a, b) => sortAsc(a.close, b.close) || sortAsc(a.open, b.open));
  upcoming.sort((a, b) => sortAsc(a.open, b.open) || sortAsc(a.close, b.close));
  closed.sort((a, b) => sortDesc(a.close, b.close) || sortDesc(a.open, b.open));

  return { open, upcoming, closed };
}

let tabListenersAttached = false;
export function attachTabListeners(onTrigger: () => void = initFeatures): void {
  if (tabListenersAttached) return;
  tabListenersAttached = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        '.gmp-tab-pills-desktop button, .section-tabs button, .ntab, .gmp-mob-tab-btn, ' +
        '.table-controls button, .filter-right button, .vt-btn, .gmp-mob-vt-btn, ' +
        '.gmp-mob-apply-btn, .gmp-mob-clear-btn, .view-toggle button, .gmp-mob-view-toggle button, ' +
        '.pagination button, .page-link, .nav-pills button'
      )
    ) {
      onTrigger();
    }
  });

  document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('select, .filter-select, .gmp-filter-select')) {
      onTrigger();
    }
  });
}

export function sortHomepageTable(): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('.gmp-table-creative tbody');
  if (!tbody || (tbody.offsetWidth === 0 && tbody.offsetHeight === 0)) return;

  const rawRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr:not(.big-section-divider)'));
  const rows = rawRows.filter((tr) => tr.cells.length > 1 && !tr.innerText.includes('Loading'));
  if (rows.length === 0) return;

  const items: SortItem<HTMLTableRowElement>[] = rows.map((tr) => {
    const periodText = tr.querySelector('td:last-child')?.textContent ?? '';
    const dates = parsePeriod(periodText);
    const status = getRowStatus(tr, dates.open, dates.close);
    return { element: tr, status, ...dates };
  });

  const { open, upcoming, closed } = bucketAndSort(items);

  const table = tbody.closest('table');
  const thCount = table?.querySelectorAll('thead th').length ?? 0;
  const colSpan = thCount > 0 ? thCount : (tbody.rows[0]?.cells.length ?? 5);

  tbody.querySelectorAll('.big-section-divider').forEach((d) => d.remove());

  appendTableSection(tbody, colSpan, 'Open IPOs', '🟢', open, 'big-divider-open');
  appendTableSection(tbody, colSpan, 'Upcoming IPOs', '🟡', upcoming, 'big-divider-upcoming');
  appendTableSection(tbody, colSpan, 'Closed / Listed IPOs', '⚪', closed, 'big-divider-closed');
}

export function sortHomepageGrid(): void {
  const grid = document.querySelector<HTMLElement>('.gmp-cards, .ipo-cards-container');
  if (!grid || (grid.offsetWidth === 0 && grid.offsetHeight === 0)) return;

  const cards = Array.from(
    grid.querySelectorAll<HTMLElement>('.ipo-card:not(.big-grid-divider)')
  ).filter((c) => c.innerText.trim().length > 0 && !c.classList.contains('ad-card'));
  if (cards.length === 0) return;

  const items: SortItem<HTMLElement>[] = cards.map((card) => {
    const periodText = card.querySelector('.ipo-card-body')?.textContent ?? card.innerText;
    const dates = parsePeriod(periodText);
    const status = getCardStatus(card, dates.open, dates.close);
    return { element: card, status, ...dates };
  });

  const { open, upcoming, closed } = bucketAndSort(items);

  grid.querySelectorAll('.big-grid-divider').forEach((d) => d.remove());

  appendGridSection(grid, 'Open IPOs', '🟢', open, 'big-divider-open');
  appendGridSection(grid, 'Upcoming IPOs', '🟡', upcoming, 'big-divider-upcoming');
  appendGridSection(grid, 'Closed / Listed IPOs', '⚪', closed, 'big-divider-closed');
}

export function sortReportTable(): void {
  const table = document.querySelector<HTMLTableElement>(
    '.report-data-table, table.report-table, .report-table-scrollwrap table, #reportTable'
  );
  if (!table) return;

  const tbody = table.querySelector<HTMLTableSectionElement>('tbody');
  if (!tbody) return;

  let openCol = -1;
  let closeCol = -1;
  let periodCol = -1;

  const ths = table.querySelectorAll<HTMLTableCellElement>('thead th');
  ths.forEach((th, idx) => {
    const t = th.innerText.toUpperCase().trim();
    if (/\b(OPEN|OPENING)\b/i.test(t) && !/\b(CLOSE|CLOSING)\b/i.test(t)) {
      openCol = idx;
    }
    if (/\b(CLOS(?:E|ING)|CLOSE\s*DATE|CLOSING\s*DATE)\b/i.test(t)) {
      closeCol = idx;
    }
    if (/\b(PERIOD|DATES?|ISSUE\s*PERIOD|ISSUE\s*DATES?)\b/i.test(t)) {
      periodCol = idx;
    }
  });

  const rawRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr:not(.big-section-divider)'));
  const rows = rawRows.filter((tr) => tr.cells.length > 1 && !tr.querySelector('th') && !tr.innerText.includes('Loading'));
  if (rows.length === 0) return;

  const items: SortItem<HTMLTableRowElement>[] = rows.map((tr) => {
    const cells = tr.querySelectorAll<HTMLTableCellElement>('td');
    let open = NaN;
    let close = NaN;

    if (openCol >= 0 && cells[openCol]) {
      open = parseDate(cells[openCol].innerText);
    }
    if (closeCol >= 0 && cells[closeCol]) {
      close = parseDate(cells[closeCol].innerText);
    }
    if (isNaN(open) && isNaN(close) && periodCol >= 0 && cells[periodCol]) {
      const p = parsePeriod(cells[periodCol].innerText);
      open = p.open;
      close = p.close;
    }

    const status = getRowStatus(tr, open, close);
    return { element: tr, status, open, close };
  });

  const { open, upcoming, closed } = bucketAndSort(items);

  tbody.querySelectorAll('.big-section-divider').forEach((d) => d.remove());

  const colCount = ths.length > 0 ? ths.length : (tbody.rows[0]?.cells.length ?? 13);
  appendTableSection(tbody, colCount, 'Open IPOs', '🟢', open, 'big-divider-open');
  appendTableSection(tbody, colCount, 'Upcoming IPOs', '🟡', upcoming, 'big-divider-upcoming');
  appendTableSection(tbody, colCount, 'Closed / Listed IPOs', '⚪', closed, 'big-divider-closed');
}

export function initFeatures(): void {
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

function appendTableSection(
  tbody: HTMLTableSectionElement,
  colSpan: number,
  title: string,
  icon: string,
  items: SortItem<HTMLTableRowElement>[],
  className: string
): void {
  if (items.length === 0) return;

  const divTr = document.createElement('tr');
  divTr.className = `big-section-divider ${className}`;
  divTr.innerHTML = `
    <td colspan="${colSpan}">
      ${icon} <strong>${title}</strong> (${items.length})
    </td>
  `;

  tbody.appendChild(divTr);
  items.forEach((item) => tbody.appendChild(item.element));
}

function appendGridSection(
  grid: HTMLElement,
  title: string,
  icon: string,
  items: SortItem<HTMLElement>[],
  className: string
): void {
  if (items.length === 0) return;

  const div = document.createElement('div');
  div.className = `big-grid-divider ${className}`;
  div.innerHTML = `${icon} <strong>${title}</strong> (${items.length})`;

  grid.appendChild(div);
  items.forEach((item) => grid.appendChild(item.element));
}
