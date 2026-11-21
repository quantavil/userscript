import type { CustomerRecord, VgmContainerRow } from '../types';
import { SIZE_SHORT, TYPE_SHORT } from './constants';

const ISO_CONTAINER_RE = /^[A-Z]{4}\d{7}$/;

export function isValidContainerNo(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  return trimmed === '' || ISO_CONTAINER_RE.test(trimmed);
}

export function isOverCscLimit(vgmWt: string, cscMaxWt: string): boolean {
  const vgm = Number(vgmWt);
  const max = Number(cscMaxWt);
  return vgm > 0 && max > 0 && vgm > max;
}

export function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Prevents repeating customers by checking both normalized Name and Reg No.
 * Pass `excludeId` when editing an existing customer.
 */
export function findDuplicateCustomer(
  customers: CustomerRecord[],
  candidate: { name: string; regNo: string },
  excludeId?: string,
): { field: 'name' | 'regNo'; existing: CustomerRecord } | null {
  const targetName = normalizeKey(candidate.name);
  const targetReg = normalizeKey(candidate.regNo);

  for (const c of customers) {
    if (excludeId && c.id === excludeId) continue;
    if (targetName && normalizeKey(c.name) === targetName) {
      return { field: 'name', existing: c };
    }
    if (targetReg && normalizeKey(c.regNo) === targetReg) {
      return { field: 'regNo', existing: c };
    }
  }
  return null;
}

export function formatOdexTimestamp(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateDDMMYYYY(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** Converts `dd-mm-yyyy hh:mm` -> `yyyy-mm-ddThh:mm` for `<input type="datetime-local">`. */
export function toDatetimeLocal(odexStr: string): string {
  const m = odexStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
}

/** Converts `yyyy-mm-ddThh:mm` -> `dd-mm-yyyy hh:mm` for ODeX & PDF. */
export function fromDatetimeLocal(isoLocal: string): string {
  const m = isoLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return isoLocal;
  return `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`;
}

/** Formats numbers cleanly with Indian/international grouping for PDF readability. */
export function formatWeight(val: string | number): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Groups container sizes accurately for multi-container declarations (e.g. `3 × 20' GP, 2 × 40' HC`). */
export function summarizeContainerSizes(rows: VgmContainerRow[]): string {
  if (rows.length === 0) return '—';
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = `${SIZE_SHORT[r.sizeCode]} ${TYPE_SHORT[r.typeCode]}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => `${count} × ${label}`)
    .join(', ');
}

/** Splits an address cleanly along word boundaries into 3 × 35-char lines for ODeX. */
export function splitAddressLines(address: string, maxLen = 35): [string, string, string] {
  const words = address.trim().split(/\s+/).filter(Boolean);
  const lines: [string, string, string] = ['', '', ''];
  let idx = 0;

  for (const word of words) {
    const candidate = lines[idx] ? `${lines[idx]} ${word}` : word;
    if (candidate.length <= maxLen) {
      lines[idx] = candidate;
    } else if (idx < 2) {
      idx += 1;
      lines[idx] = word.slice(0, maxLen);
    } else {
      break;
    }
  }

  return lines;
}

export function validateRowForSubmission(row: VgmContainerRow): string | null {
  if (!row.bookingNo.trim()) return 'Enter Booking No. first.';
  if (!row.containerNo.trim()) return 'Enter Container No. first.';
  if (!isValidContainerNo(row.containerNo)) {
    return 'Container No. must match ISO format (4 letters + 7 digits, e.g. TXGU8834456).';
  }
  if (!row.vgmWt.trim() || Number(row.vgmWt) <= 0) {
    return 'Enter a valid VGM weight (KG).';
  }
  if (isOverCscLimit(row.vgmWt, row.cscMaxWt)) {
    return `VGM (${row.vgmWt} KG) exceeds CSC Max Limit (${row.cscMaxWt} KG).`;
  }
  return null;
}
