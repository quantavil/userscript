import * as v from 'valibot';
import { ExportSchema } from '../config/schema.ts';
import { parseSites, type Store } from '../config/store.ts';

/** Exports site rules only. API keys never leave storage. */
export function exportSites(store: Store): void {
  const payload = { app: 'universal-captcha-solver', version: 2, sites: store.sites.value };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `captcha-solver-sites-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Validates and merges; returns how many rules were imported. Throws with a readable message. */
export function importSites(store: Store, json: string): number {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Not a valid JSON file');
  }
  const parsed = v.safeParse(ExportSchema, data);
  if (!parsed.success) throw new Error('Not a Universal Captcha Solver export');
  const sites = parseSites(parsed.output.sites);
  const count = Object.keys(sites).length;
  if (!count) throw new Error('No valid rules found in file');
  store.mergeSites(sites);
  return count;
}

export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json,.json' });
    input.onchange = () => (input.files?.[0] ? void input.files[0].text().then(resolve) : resolve(null));
    input.oncancel = () => resolve(null);
    input.click();
  });
}
