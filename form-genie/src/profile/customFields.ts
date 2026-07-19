/**
 * Shared custom-field construction. Both the Teach picker and the profile editor
 * let the user mint a `custom.*` field; this funnels the slug/collision/options
 * logic through one place so the two entry points can't drift apart.
 */
import { FieldDef, FieldKind, FIELD_CATALOG } from './schema';

export type CustomFieldInput = {
  label: string;
  kind: FieldKind;
  /** Raw comma-separated options string (only read for `select` kind). */
  optionsText?: string;
};

export type CustomFieldResult =
  | { ok: true; field: FieldDef }
  | { ok: false; error: string };

/** Slugify a label into a stable `custom.<slug>` key. */
export function customFieldKey(label: string): string {
  return 'custom.' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Validate a user-entered custom field. Checks the label, guards against key
 * collisions with any existing catalog entry, and parses select options.
 */
export function buildCustomField(input: CustomFieldInput): CustomFieldResult {
  const label = input.label.trim();
  if (!label) return { ok: false, error: 'Enter a field label.' };

  const key = customFieldKey(label);
  if (key === 'custom.') return { ok: false, error: 'Label must contain letters or numbers.' };
  if (FIELD_CATALOG[key] !== undefined) {
    return { ok: false, error: 'A field with this label already exists.' };
  }

  let options: string[] | undefined;
  if (input.kind === 'select') {
    options = (input.optionsText ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!options.length) return { ok: false, error: 'Enter at least one option for a choices field.' };
  }

  return { ok: true, field: { key, label, kind: input.kind, options } };
}
