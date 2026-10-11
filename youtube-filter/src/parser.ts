import type { FormValidationResult, ValidationResult } from './types';

/**
 * Parses numeric strings with optional K/M/B suffix (e.g. 1.5K -> 1500, 10M -> 10000000, 124 000 -> 124000).
 */
export const parseNumberWithSuffix = (txt: string): number => {
  if (!txt) return 0;
  // Normalize non-breaking spaces and remove commas
  const cleaned = txt.replace(/[\s\u00A0,]/g, '');
  const m = cleaned.match(/^([\d.]+)([KMBkmb])?$/i);
  if (m) {
    let n = parseFloat(m[1]) || 0;
    const s = (m[2] || '').toUpperCase();
    if (s === 'K') n *= 1e3;
    else if (s === 'M') n *= 1e6;
    else if (s === 'B') n *= 1e9;
    return Math.floor(n);
  }
  const digitsOnly = cleaned.replace(/[^\d]/g, '');
  const num = parseInt(digitsOnly, 10);
  return Number.isFinite(num) ? num : 0;
};

/**
 * Parses view count string from YouTube metadata (e.g. "124K views" -> 124000, "124 000 views" -> 124000, "124K views • 2 days ago" -> 124000).
 */
export const parseViews = (txt: string): number => {
  if (!txt) return 0;
  // If string contains "views", isolate the number immediately preceding "views"
  const m = txt.match(/([\d.,\s\u00A0]+)\s*([KMBkmb])?\s*views?/i);
  if (m) {
    const numPart = m[1].replace(/[\s\u00A0,]/g, '');
    let n = parseFloat(numPart) || 0;
    const s = (m[2] || '').toUpperCase();
    if (s === 'K') n *= 1e3;
    else if (s === 'M') n *= 1e6;
    else if (s === 'B') n *= 1e9;
    return Math.floor(n);
  }
  return parseNumberWithSuffix((txt || '').replace(/views?/i, '').trim());
};

/**
 * Parses relative upload time to approximate fractional days ago.
 * Handles "2 days ago", "1 month ago", "just now", "streamed 3 hours ago", etc.
 */
export const parseDaysAgo = (txt: string): number => {
  if (!txt) return Infinity;
  const s = txt
    .toLowerCase()
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Instant / just now uploads
  if (/(just now|moments? ago|right now)/i.test(s)) {
    return 0;
  }

  const cleaned = s.replace(/streamed/g, '').replace(/premiered/g, '').replace(/live/g, '').trim();
  const m = cleaned.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?/);
  if (!m) return Infinity;

  const v = parseInt(m[1], 10);
  const unit = m[2];
  const mult: Record<string, number> = {
    second: 1 / (24 * 3600),
    minute: 1 / (24 * 60),
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365
  };
  return v * (mult[unit] || 1);
};

/**
 * Parses duration timestamp (e.g. "12:34" or "1:02:03") to integer minutes.
 * Returns NaN for empty strings or non-timestamp text (e.g. LIVE, UPCOMING, PREMIERE).
 */
export const parseDuration = (txt: string): number => {
  if (!txt) return Number.NaN;
  const t = txt.trim();

  // Only parse valid timestamps (MM:SS or HH:MM:SS)
  if (!/^(\d+:)?\d+:\d+$/.test(t)) {
    return Number.NaN;
  }

  const parts = t.split(':').map((x) => parseInt(x, 10) || 0);
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  else seconds = parts[0] || 0;

  return Math.floor(seconds / 60);
};

/**
 * Formats a Date object as YYYY-MM-DD in local time (no UTC offset shift).
 */
export const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Converts a daysAgo count to a local date string normalized to local noon.
 */
export const daysAgoToDate = (days: number): string => {
  if (!Number.isFinite(days) || days === Infinity) return '';
  const d = new Date();
  d.setHours(12, 0, 0, 0); // Normalize to noon
  d.setDate(d.getDate() - Math.floor(days));
  return toLocalISODate(d);
};

/**
 * Converts a YYYY-MM-DD date string to daysAgo integer normalized to local noon.
 * Uses Math.round to avoid DST transition shift off-by-one errors.
 */
export const dateToDaysAgo = (dateStr: string): number => {
  if (!dateStr) return Infinity;
  const d = new Date(`${dateStr}T12:00:00`); // Force local noon
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  now.setHours(12, 0, 0, 0); // Normalize current time
  return Math.round((now.getTime() - d.getTime()) / 86400000);
};

/**
 * Validates a number input value, optionally allowing suffixes like K/M/B.
 */
export const validateNumberInput = (
  value: string,
  allowSuffix = false
): ValidationResult<number | null> => {
  if (value === '' || value == null) return { valid: true, value: null };

  const cleaned = value.replace(/[,\s]/g, '');

  if (allowSuffix) {
    if (!/^[\d.]+[KMB]?$/i.test(cleaned)) {
      return { valid: false, error: 'Use format: 1.5K, 10M, or 1,234' };
    }
    return { valid: true, value: parseNumberWithSuffix(value) };
  }

  const num = parseInt(cleaned, 10);
  if (!Number.isFinite(num) || num < 0) {
    return { valid: false, error: 'Must be a positive number' };
  }

  return { valid: true, value: num };
};

/**
 * Validates a date string (YYYY-MM-DD), ensuring it's not in the future.
 */
export const validateDateInput = (value: string): ValidationResult<string | null> => {
  if (value === '' || value == null) return { valid: true, value: null };

  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const inputDate = new Date(`${value}T00:00:00`);

  if (inputDate > now) {
    return { valid: false, error: 'Date cannot be in the future' };
  }

  return { valid: true, value };
};

export interface FormInputsRaw {
  minViews: string;
  maxViews: string;
  minDate: string;
  maxDate: string;
  minDur: string;
  maxDur: string;
}

export interface FormValidationErrors {
  minViews?: string;
  maxViews?: string;
  minDate?: string;
  maxDate?: string;
  minDur?: string;
  maxDur?: string;
}

/**
 * Pure validation logic for all filter form inputs including bounds cross-validation.
 */
export const validateFormValues = (
  inputs: FormInputsRaw
): { result: FormValidationResult; errors: FormValidationErrors } => {
  const minViewsVal = validateNumberInput(inputs.minViews.trim(), true);
  const maxViewsVal = validateNumberInput(inputs.maxViews.trim(), true);
  const minDateVal = validateDateInput(inputs.minDate.trim());
  const maxDateVal = validateDateInput(inputs.maxDate.trim());
  const minDurVal = validateNumberInput(inputs.minDur.trim(), false);
  const maxDurVal = validateNumberInput(inputs.maxDur.trim(), false);

  const errors: FormValidationErrors = {};
  let hasError = false;

  if (!minViewsVal.valid) {
    errors.minViews = minViewsVal.error;
    hasError = true;
  }
  if (!maxViewsVal.valid) {
    errors.maxViews = maxViewsVal.error;
    hasError = true;
  }
  if (!minDateVal.valid) {
    errors.minDate = minDateVal.error;
    hasError = true;
  }
  if (!maxDateVal.valid) {
    errors.maxDate = maxDateVal.error;
    hasError = true;
  }
  if (!minDurVal.valid) {
    errors.minDur = minDurVal.error;
    hasError = true;
  }
  if (!maxDurVal.valid) {
    errors.maxDur = maxDurVal.error;
    hasError = true;
  }

  // Views bounds cross-validation: Min <= Max
  if (
    minViewsVal.valid &&
    maxViewsVal.valid &&
    minViewsVal.value != null &&
    maxViewsVal.value != null
  ) {
    if (minViewsVal.value > maxViewsVal.value) {
      errors.minViews = 'Min views cannot exceed Max views';
      hasError = true;
    }
  }

  // Duration bounds cross-validation: Min <= Max
  if (
    minDurVal.valid &&
    maxDurVal.valid &&
    minDurVal.value != null &&
    maxDurVal.value != null
  ) {
    if (minDurVal.value > maxDurVal.value) {
      errors.minDur = 'Min duration cannot exceed Max duration';
      hasError = true;
    }
  }

  // Date range cross-validation: "From" date must not be after "To" date
  if (minDateVal.valid && maxDateVal.valid && minDateVal.value && maxDateVal.value) {
    const fromDate = new Date(minDateVal.value);
    const toDate = new Date(maxDateVal.value);
    if (fromDate > toDate) {
      errors.minDate = 'From date must be before To date';
      hasError = true;
    }
  }

  return {
    result: {
      valid: !hasError,
      minViews: minViewsVal.value,
      maxViews: maxViewsVal.value,
      minDate: minDateVal.value,
      maxDate: maxDateVal.value,
      minDur: minDurVal.value,
      maxDur: maxDurVal.value
    },
    errors
  };
};
