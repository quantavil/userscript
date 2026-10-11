import { describe, expect, it } from 'vitest';
import {
  dateToDaysAgo,
  daysAgoToDate,
  parseDaysAgo,
  parseDuration,
  parseNumberWithSuffix,
  parseViews,
  toLocalISODate,
  validateDateInput,
  validateFormValues,
  validateNumberInput
} from '../src/parser';

describe('parser.ts', () => {
  describe('parseNumberWithSuffix', () => {
    it('parses plain numbers', () => {
      expect(parseNumberWithSuffix('500')).toBe(500);
      expect(parseNumberWithSuffix('1,234')).toBe(1234);
      expect(parseNumberWithSuffix('10 000')).toBe(10000);
      expect(parseNumberWithSuffix('0')).toBe(0);
    });

    it('parses numbers with K, M, B suffixes and handles whitespace/non-breaking spaces', () => {
      expect(parseNumberWithSuffix('10K')).toBe(10000);
      expect(parseNumberWithSuffix('1.5K')).toBe(1500);
      expect(parseNumberWithSuffix('2.35M')).toBe(2350000);
      expect(parseNumberWithSuffix('1.2B')).toBe(1200000000);
      expect(parseNumberWithSuffix('500k')).toBe(500000);
      expect(parseNumberWithSuffix('2m')).toBe(2000000);
      expect(parseNumberWithSuffix('1b')).toBe(1000000000);
      expect(parseNumberWithSuffix('124\u00A0K')).toBe(124000);
    });

    it('handles empty and invalid input safely', () => {
      expect(parseNumberWithSuffix('')).toBe(0);
      expect(parseNumberWithSuffix('abc')).toBe(0);
    });
  });

  describe('parseViews', () => {
    it('extracts view counts correctly', () => {
      expect(parseViews('124K views')).toBe(124000);
      expect(parseViews('1.5M views')).toBe(1500000);
      expect(parseViews('10,500 views')).toBe(10500);
      expect(parseViews('1 view')).toBe(1);
      expect(parseViews('No views')).toBe(0);
      expect(parseViews('124\u00A0000 views')).toBe(124000);
    });

    it('extracts view counts from combined YouTube metadata lines with bullets', () => {
      expect(parseViews('124K views • 2 days ago')).toBe(124000);
      expect(parseViews('1.5M views • 3 weeks ago')).toBe(1500000);
      expect(parseViews('1 view • 5 hours ago')).toBe(1);
      expect(parseViews('2.4B views • 10 years ago')).toBe(2400000000);
      expect(parseViews('No views • 1 day ago')).toBe(0);
    });
  });

  describe('parseDaysAgo', () => {
    it('calculates days for various relative units', () => {
      expect(parseDaysAgo('1 day ago')).toBe(1);
      expect(parseDaysAgo('5 days ago')).toBe(5);
      expect(parseDaysAgo('2 weeks ago')).toBe(14);
      expect(parseDaysAgo('1 month ago')).toBe(30);
      expect(parseDaysAgo('2 years ago')).toBe(730);
    });

    it('handles streamed and premiered prefixes and non-breaking spaces', () => {
      expect(parseDaysAgo('Streamed 3 days ago')).toBe(3);
      expect(parseDaysAgo('Streamed live 5 hours ago')).toBeCloseTo(5 / 24);
      expect(parseDaysAgo('Premiered 1 week ago')).toBe(7);
      expect(parseDaysAgo('Streamed 24 hours ago')).toBe(1);
      expect(parseDaysAgo('Premiered 2\u00A0weeks\u00A0ago')).toBe(14);
    });

    it('handles recent upload phrases as 0 days ago', () => {
      expect(parseDaysAgo('just now')).toBe(0);
      expect(parseDaysAgo('moments ago')).toBe(0);
      expect(parseDaysAgo('Streamed live just now')).toBe(0);
    });

    it('returns Infinity for missing or non-matching time strings', () => {
      expect(parseDaysAgo('')).toBe(Infinity);
      expect(parseDaysAgo('unknown date')).toBe(Infinity);
    });
  });

  describe('parseDuration', () => {
    it('parses MM:SS into minutes (floored)', () => {
      expect(parseDuration('12:34')).toBe(12);
      expect(parseDuration('0:45')).toBe(0);
      expect(parseDuration('59:59')).toBe(59);
      expect(parseDuration('0:00')).toBe(0);
    });

    it('parses HH:MM:SS into total minutes', () => {
      expect(parseDuration('1:02:03')).toBe(62);
      expect(parseDuration('2:00:00')).toBe(120);
    });

    it('returns NaN for non-timestamp badges (UPCOMING, PREMIERE, LIVE) and empty input', () => {
      expect(Number.isNaN(parseDuration('LIVE'))).toBe(true);
      expect(Number.isNaN(parseDuration('Live'))).toBe(true);
      expect(Number.isNaN(parseDuration('LIVE NOW'))).toBe(true);
      expect(Number.isNaN(parseDuration('UPCOMING'))).toBe(true);
      expect(Number.isNaN(parseDuration('PREMIERE'))).toBe(true);
      expect(Number.isNaN(parseDuration('SHORTS'))).toBe(true);
      expect(Number.isNaN(parseDuration(''))).toBe(true);
    });
  });

  describe('Date conversion utilities', () => {
    it('formats local ISO dates without UTC shift', () => {
      const d = new Date(2024, 0, 15); // Jan 15, 2024 local
      expect(toLocalISODate(d)).toBe('2024-01-15');
    });

    it('converts daysAgo to YYYY-MM-DD string', () => {
      expect(daysAgoToDate(Infinity)).toBe('');
      const todayIso = toLocalISODate(new Date());
      expect(daysAgoToDate(0)).toBe(todayIso);
    });

    it('converts date strings to daysAgo integer', () => {
      expect(dateToDaysAgo('')).toBe(Infinity);
      expect(dateToDaysAgo('invalid-date')).toBe(Infinity);

      const todayIso = toLocalISODate(new Date());
      expect(dateToDaysAgo(todayIso)).toBe(0);
    });
  });

  describe('Form validation', () => {
    it('validates number inputs correctly', () => {
      expect(validateNumberInput('', false)).toEqual({ valid: true, value: null });
      expect(validateNumberInput('15', false)).toEqual({ valid: true, value: 15 });
      expect(validateNumberInput('-5', false)).toEqual({
        valid: false,
        error: 'Must be a positive number'
      });
      expect(validateNumberInput('1.5M', true)).toEqual({
        valid: true,
        value: 1500000
      });
      expect(validateNumberInput('10X', true)).toEqual({
        valid: false,
        error: 'Use format: 1.5K, 10M, or 1,234'
      });
    });

    it('validates date inputs correctly', () => {
      expect(validateDateInput('')).toEqual({ valid: true, value: null });
      expect(validateDateInput('2020-01-01')).toEqual({
        valid: true,
        value: '2020-01-01'
      });
      expect(validateDateInput('invalid')).toEqual({
        valid: false,
        error: 'Invalid date format'
      });

      const futureYear = new Date().getFullYear() + 2;
      expect(validateDateInput(`${futureYear}-01-01`)).toEqual({
        valid: false,
        error: 'Date cannot be in the future'
      });
    });

    it('validates cross-field date range order', () => {
      const validForm = validateFormValues({
        minViews: '10K',
        maxViews: '1M',
        minDate: '2023-01-01',
        maxDate: '2024-01-01',
        minDur: '5',
        maxDur: '60'
      });
      expect(validForm.result.valid).toBe(true);

      const invalidRange = validateFormValues({
        minViews: '',
        maxViews: '',
        minDate: '2024-01-01',
        maxDate: '2023-01-01',
        minDur: '',
        maxDur: ''
      });
      expect(invalidRange.result.valid).toBe(false);
      expect(invalidRange.errors.minDate).toBe('From date must be before To date');
    });

    it('validates minViews <= maxViews and minDur <= maxDur', () => {
      const invalidViews = validateFormValues({
        minViews: '10M',
        maxViews: '100K',
        minDate: '',
        maxDate: '',
        minDur: '',
        maxDur: ''
      });
      expect(invalidViews.result.valid).toBe(false);
      expect(invalidViews.errors.minViews).toBe('Min views cannot exceed Max views');

      const invalidDur = validateFormValues({
        minViews: '',
        maxViews: '',
        minDate: '',
        maxDate: '',
        minDur: '30',
        maxDur: '10'
      });
      expect(invalidDur.result.valid).toBe(false);
      expect(invalidDur.errors.minDur).toBe('Min duration cannot exceed Max duration');
    });
  });
});
