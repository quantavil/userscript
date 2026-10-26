import { describe, expect, test } from 'bun:test';
import { dateRange, toCsv } from '../src/shipping-bill/tools';

describe('Shipping Bill tools', () => {
  test('uses local calendar days across month and year boundaries', () => {
    const now = new Date(2026, 0, 2, 13);
    expect(dateRange('today', now)).toEqual(['02-01-2026', '02-01-2026']);
    expect(dateRange('yesterday', now)).toEqual(['01-01-2026', '01-01-2026']);
    expect(dateRange('week', now)).toEqual(['27-12-2025', '02-01-2026']);
    expect(dateRange('month', now)).toEqual(['01-01-2026', '02-01-2026']);
  });
  test('quotes CSV fields and treats spreadsheet formulas as text', () => {
    expect(toCsv([['Job', 'Name'], ['123', 'A, "B"'], ['=1+1', 'line\n2']])).toBe('"Job","Name"\r\n"123","A, ""B"""\r\n"\'=1+1","line\n2"');
  });
});
