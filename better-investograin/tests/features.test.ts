import { describe, expect, it } from 'bun:test';
import {
  bucketAndSort,
  getStatusFromText,
  parseDate,
  parsePeriod,
  SortItem,
} from '../src/features';

describe('Date Parsing & Timestamps', () => {
  it('parses standard day-month format', () => {
    const ts = parseDate('18-Aug');
    expect(isNaN(ts)).toBe(false);
    const date = new Date(ts);
    expect(date.getDate()).toBe(18);
    expect(date.getMonth()).toBe(7); // Aug is 7 (0-indexed)
  });

  it('parses month-first format', () => {
    const ts = parseDate('Aug 18, 2026');
    expect(isNaN(ts)).toBe(false);
    const date = new Date(ts);
    expect(date.getDate()).toBe(18);
    expect(date.getMonth()).toBe(7);
  });

  it('parses full month names ("August 18, 2026", "September 1st")', () => {
    const ts1 = parseDate('August 18, 2026');
    expect(isNaN(ts1)).toBe(false);
    expect(new Date(ts1).getDate()).toBe(18);
    expect(new Date(ts1).getMonth()).toBe(7);

    const ts2 = parseDate('1st September');
    expect(isNaN(ts2)).toBe(false);
    expect(new Date(ts2).getDate()).toBe(1);
    expect(new Date(ts2).getMonth()).toBe(8);
  });

  it('parses ordinal dates ("18th Aug", "Aug 22nd, 2026")', () => {
    const ts1 = parseDate('18th Aug');
    expect(isNaN(ts1)).toBe(false);
    expect(new Date(ts1).getDate()).toBe(18);

    const ts2 = parseDate('Aug 22nd, 2026');
    expect(isNaN(ts2)).toBe(false);
    expect(new Date(ts2).getDate()).toBe(22);
    expect(new Date(ts2).getFullYear()).toBe(2026);
  });

  it('parses date with explicit 4-digit and 2-digit year', () => {
    const ts2025 = parseDate('18-Aug-2025');
    expect(new Date(ts2025).getFullYear()).toBe(2025);

    const ts27 = parseDate('22 Sep 27');
    expect(new Date(ts27).getFullYear()).toBe(2027);
    expect(new Date(ts27).getDate()).toBe(22);
  });

  it('parses numeric date formats (DD-MM-YYYY, YYYY-MM-DD)', () => {
    const tsDmy = parseDate('18-08-2026');
    expect(new Date(tsDmy).getDate()).toBe(18);
    expect(new Date(tsDmy).getMonth()).toBe(7);

    const tsIso = parseDate('2026-08-18');
    expect(new Date(tsIso).getDate()).toBe(18);
    expect(new Date(tsIso).getMonth()).toBe(7);
  });

  it('parses period with two distinct dates and ordinals', () => {
    const period = parsePeriod('18th-Aug to 22nd-Aug');
    expect(isNaN(period.open)).toBe(false);
    expect(isNaN(period.close)).toBe(false);
    expect(new Date(period.open).getDate()).toBe(18);
    expect(new Date(period.close).getDate()).toBe(22);
    expect(period.open < period.close).toBe(true);
  });

  it('parses cross-month periods ("28 Aug - 1 Sep", "28th-Aug to 1st-Sep")', () => {
    const p1 = parsePeriod('28 Aug - 1 Sep');
    expect(isNaN(p1.open)).toBe(false);
    expect(isNaN(p1.close)).toBe(false);
    expect(new Date(p1.open).getDate()).toBe(28);
    expect(new Date(p1.open).getMonth()).toBe(7);
    expect(new Date(p1.close).getDate()).toBe(1);
    expect(new Date(p1.close).getMonth()).toBe(8);
  });

  it('parses period with start day range like "18 - 22 Aug" or "1 - 3 Sep"', () => {
    const period = parsePeriod('18 - 22 Aug');
    expect(isNaN(period.open)).toBe(false);
    expect(isNaN(period.close)).toBe(false);
    expect(new Date(period.open).getDate()).toBe(18);
    expect(new Date(period.close).getDate()).toBe(22);

    const pSep = parsePeriod('1 - 3 Sep');
    expect(new Date(pSep.open).getDate()).toBe(1);
    expect(new Date(pSep.close).getDate()).toBe(3);
  });

  it('does NOT get confused by price/lot numbers preceding the date range in card text', () => {
    // Critical bug regression test: Prices like "₹90 - ₹95" or "100 - 108" before the period
    const text1 = 'Price: ₹90 - ₹95 | Lot: 1600 | 1 - 3 Sep';
    const p1 = parsePeriod(text1);
    expect(new Date(p1.open).getDate()).toBe(1);
    expect(new Date(p1.close).getDate()).toBe(3);
    expect(new Date(p1.close).getMonth()).toBe(8); // Sep

    const text2 = '+₹52 (+63.41% est.) Price: 82 to 86 | Period: 27 - 31 Aug';
    const p2 = parsePeriod(text2);
    expect(new Date(p2.open).getDate()).toBe(27);
    expect(new Date(p2.close).getDate()).toBe(31);
    expect(new Date(p2.close).getMonth()).toBe(7); // Aug
  });

  it('parses month-first range like "Aug 18 - 22"', () => {
    const period = parsePeriod('Aug 18 - 22');
    expect(isNaN(period.open)).toBe(false);
    expect(isNaN(period.close)).toBe(false);
    expect(new Date(period.open).getDate()).toBe(18);
    expect(new Date(period.close).getDate()).toBe(22);
  });

  it('returns NaN gracefully for missing/invalid dates', () => {
    expect(isNaN(parseDate(''))).toBe(true);
    expect(isNaN(parseDate('-'))).toBe(true);
    expect(isNaN(parseDate(undefined))).toBe(true);
    const p = parsePeriod('');
    expect(isNaN(p.open)).toBe(true);
    expect(isNaN(p.close)).toBe(true);
  });
});

describe('Status Classification (Keywords, Suffixes, & Timestamp Fallbacks)', () => {
  it('correctly classifies status keywords and ticker suffixes', () => {
    expect(getStatusFromText('OPEN')).toBe('OPEN');
    expect(getStatusFromText('ACTIVE')).toBe('OPEN');
    expect(getStatusFromText('IPOO')).toBe('OPEN');
    expect(getStatusFromText('SMEO')).toBe('OPEN');
    expect(getStatusFromText('Lumino Industries IPOO')).toBe('OPEN');
    expect(getStatusFromText('MAINBOARDOPEN')).toBe('OPEN');

    expect(getStatusFromText('UPCOMING')).toBe('UPCOMING');
    expect(getStatusFromText('OPENING SOON')).toBe('UPCOMING');
    expect(getStatusFromText('OPENS TODAY')).toBe('UPCOMING');
    expect(getStatusFromText('IPOU')).toBe('UPCOMING');
    expect(getStatusFromText('SMEU')).toBe('UPCOMING');
    expect(getStatusFromText('Rays of Belief IPOU')).toBe('UPCOMING');
    expect(getStatusFromText('MAINBOARDUPCOMING')).toBe('UPCOMING');

    expect(getStatusFromText('CLOSED')).toBe('CLOSED');
    expect(getStatusFromText('LISTED')).toBe('CLOSED');
    expect(getStatusFromText('IPOC')).toBe('CLOSED');
    expect(getStatusFromText('SMEC')).toBe('CLOSED');
    expect(getStatusFromText('MAINBOARDCLOSED')).toBe('CLOSED');
  });

  it('avoids false positives on buttons/links like Watchlist or IPO List', () => {
    expect(getStatusFromText('Watchlist')).toBe('CLOSED');
    expect(getStatusFromText('IPO List')).toBe('CLOSED');
  });

  it('uses timestamps to infer status when text is ambiguous', () => {
    const now = Date.now();
    const futureOpen = now + 86400000 * 2; // in 2 days
    const futureClose = now + 86400000 * 5;

    const pastOpen = now - 86400000 * 5; // 5 days ago
    const pastClose = now - 86400000 * 2; // 2 days ago

    const currentOpen = now - 86400000 * 1; // yesterday
    const currentClose = now + 86400000 * 1; // tomorrow

    // Ambiguous text:
    expect(getStatusFromText('XYZ Corp', futureOpen, futureClose)).toBe('UPCOMING');
    expect(getStatusFromText('XYZ Corp', pastOpen, pastClose)).toBe('CLOSED');
    expect(getStatusFromText('XYZ Corp', currentOpen, currentClose)).toBe('OPEN');
  });
});

describe('Smart Urgency bucketAndSort', () => {
  it('correctly buckets and applies respective urgency sorts', () => {
    const dummy = (name: string): HTMLElement => {
      const el = { id: name } as unknown as HTMLElement;
      return el;
    };

    const items: SortItem<HTMLElement>[] = [
      // Open items: should sort by closing first (Close ASC)
      { element: dummy('open-closing-later'), open: 1000, close: 5000, status: 'OPEN' },
      { element: dummy('open-closing-sooner'), open: 1000, close: 2000, status: 'OPEN' },
      { element: dummy('open-nodate'), open: NaN, close: NaN, status: 'OPEN' },

      // Upcoming items: should sort by coming next (Open ASC)
      { element: dummy('upcoming-opening-later'), open: 8000, close: 10000, status: 'UPCOMING' },
      { element: dummy('upcoming-opening-sooner'), open: 3000, close: 6000, status: 'UPCOMING' },
      { element: dummy('upcoming-nodate'), open: NaN, close: NaN, status: 'UPCOMING' },

      // Closed items: should sort by which just ended (Close DESC)
      { element: dummy('closed-recently'), open: 100, close: 1500, status: 'CLOSED' },
      { element: dummy('closed-long-ago'), open: 10, close: 500, status: 'CLOSED' },
      { element: dummy('closed-nodate'), open: NaN, close: NaN, status: 'CLOSED' },
    ];

    const result = bucketAndSort(items);

    // 1. Open: sorted ASC by close date, missing dates at end
    expect(result.open.map((i) => (i.element as any).id)).toEqual([
      'open-closing-sooner',
      'open-closing-later',
      'open-nodate',
    ]);

    // 2. Upcoming: sorted ASC by open date (opening next first), missing dates at end
    expect(result.upcoming.map((i) => (i.element as any).id)).toEqual([
      'upcoming-opening-sooner',
      'upcoming-opening-later',
      'upcoming-nodate',
    ]);

    // 3. Closed: sorted DESC by close date (just ended first), missing dates at end
    expect(result.closed.map((i) => (i.element as any).id)).toEqual([
      'closed-recently',
      'closed-long-ago',
      'closed-nodate',
    ]);
  });
});
