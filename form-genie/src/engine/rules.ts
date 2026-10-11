/**
 * Field fingerprinting for per-site teach/AI rules. A fingerprint identifies a
 * field across visits without depending on volatile auto-generated ids.
 */
import { FieldDescriptor } from './describe';

const AUTO_ID = /(\d{4,}|[0-9a-f]{8}-[0-9a-f]{4}|__|ctl\d+|ember\d+|react-|:r[0-9a-z]+:)/i;

function hash(s: string): string {
  // djb2 — small, stable, dependency-free.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Stable identity for a field: name > clean id > descriptor+type hash. */
export function fingerprintOf(d: FieldDescriptor): string {
  if (d.name) return `n:${d.name}`;
  if (d.id && !AUTO_ID.test(d.id)) return `i:${d.id}`;
  return `h:${hash(d.text + '|' + d.inputType)}`;
}
