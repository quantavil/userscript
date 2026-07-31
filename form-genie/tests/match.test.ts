import { describe, it, expect } from 'bun:test';
import { matchAll, THRESHOLD_FILL } from '../src/engine/match';
import { FieldDescriptor, tokenize, normalize } from '../src/engine/describe';
import { FieldUnit } from '../src/engine/scan';

function desc(text: string, opts: Partial<FieldDescriptor> = {}): FieldDescriptor {
  const unit = { type: 'text', el: {} as any, group: [] } as FieldUnit;
  return {
    unit,
    text: normalize(text),
    tokens: tokenize(text),
    options: [],
    maxlength: null,
    pattern: null,
    inputType: 'text',
    name: opts.name ?? '',
    id: opts.id ?? '',
    ...opts,
  };
}

describe('matchAll heuristics', () => {
  it("maps father's name over full name", () => {
    const [m] = matchAll([desc("Father's Name")], []);
    expect(m.key).toBe('family.fatherName');
    expect(m.confidence).toBeGreaterThanOrEqual(THRESHOLD_FILL);
  });

  it('maps date of birth', () => {
    const [m] = matchAll([desc('Date of Birth')], []);
    expect(m.key).toBe('personal.dob');
  });

  it('maps mobile from "Mobile No."', () => {
    const [m] = matchAll([desc('Mobile No.')], []);
    expect(m.key).toBe('contact.mobile');
  });

  it('maps transliterated Hindi (pita ka naam)', () => {
    const [m] = matchAll([desc('pita ka naam')], []);
    expect(m.key).toBe('family.fatherName');
  });

  it('infers category from options regardless of label', () => {
    const d = desc('Choose', { options: ['General', 'OBC', 'SC', 'ST', 'EWS'] });
    const [m] = matchAll([d], []);
    expect(m.key).toBe('personal.category');
  });

  it('leaves gibberish unmatched', () => {
    const [m] = matchAll([desc('xyzzy plugh')], []);
    expect(m.confidence).toBeLessThan(THRESHOLD_FILL);
  });
});

describe('matchAll rules', () => {
  it('rule wins over heuristics', () => {
    const d = desc('Some Field', { name: 'field_x' });
    const rules = [{ fingerprint: 'n:field_x', occurrence: 0, key: 'ids.pan', source: 'teach' as const, ts: 0 }];
    const [m] = matchAll([d], rules);
    expect(m.key).toBe('ids.pan');
    expect(m.source).toBe('teach');
    expect(m.confidence).toBe(1);
  });

  it('assigns occurrence indices to duplicate fingerprints', () => {
    const a = desc('Name', { name: 'nm' });
    const b = desc('Name', { name: 'nm' });
    const [m0, m1] = matchAll([a, b], []);
    expect(m0.occurrence).toBe(0);
    expect(m1.occurrence).toBe(1);
  });
});
