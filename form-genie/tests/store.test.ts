import { describe, it, expect, beforeEach } from 'bun:test';
import { loadProfile, saveProfile, importBundle, loadRules, deleteRule } from '../src/profile/store';
import { runFill } from '../src/main';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('importBundle schema validation', () => {
  beforeEach(() => {
    // Clear profile storage in GreaseMonkey mock
    saveProfile({});
  });

  it('successfully imports valid profile data', () => {
    const validBundle = JSON.stringify({
      profile: {
        v: 1,
        data: {
          'personal.firstName': 'Arjun',
          'personal.lastName': 'Singh',
          'contact.email': 'arjun@gmail.com',
          '_customFields': JSON.stringify([
            { key: 'custom.mobile_belongs', label: 'Mobile Belongs', kind: 'select', options: ['Self', 'Parent'] }
          ]),
          'custom.mobile_belongs': 'Self'
        }
      }
    });

    const res = importBundle(validBundle);
    expect(res.ok).toBe(true);
    expect(loadProfile().data['personal.firstName']).toBe('Arjun');
    expect(loadProfile().data['custom.mobile_belongs']).toBe('Self');
  });

  it('rejects malformed json', () => {
    const invalidJson = '{invalid_json}';
    const res = importBundle(invalidJson);
    expect(res.ok).toBe(false);
  });

  it('rejects non-string profile values', () => {
    const invalidBundle = JSON.stringify({
      profile: {
        v: 1,
        data: {
          'personal.firstName': 123
        }
      }
    });
    const res = importBundle(invalidBundle);
    expect(res.ok).toBe(false);
    expect((res as any).error).toContain('Invalid profile data schema');
  });

  it('rejects invalid custom fields schema', () => {
    const invalidBundle = JSON.stringify({
      profile: {
        v: 1,
        data: {
          '_customFields': JSON.stringify({ key: 'invalid' }) // Should be an array
        }
      }
    });
    const res = importBundle(invalidBundle);
    expect(res.ok).toBe(false);
  });
});

describe('Suggestion persistence flow', () => {
  beforeEach(() => {
    setBody('');
    // Clear rules
    const rules = loadRules(location.hostname);
    for (const r of rules) {
      deleteRule(location.hostname, r.fingerprint, r.occurrence);
    }
  });

  it('saves an accepted suggestion as a teach rule', async () => {
    // Setup a field that scores in suggestion range (0.45 - 0.75)
    // "permanent line 2" matches address.permanent.line2 with moderate confidence (~0.54)
    setBody(`
      <label for="line2">permanent line 2</label>
      <input id="line2" name="line2">
    `);

    // Setup profile value
    saveProfile({
      'address.permanent.line1': 'Flat 4B',
      'address.permanent.line2': 'Flat 4B'
    });

    // Run fill without accepting to establish baseline suggestions
    const initialResults = await runFill(undefined, () => {});
    const suggestion = initialResults.find(r => r.match.descriptor.name === 'line2');
    expect(suggestion).toBeDefined();
    expect(suggestion?.status).toBe('suggested');

    const fp = suggestion!.match.fingerprint;

    // Run fill again, this time accepting the suggestion's fingerprint
    const fillResults = await runFill(new Set([fp]), () => {});
    const filledResult = fillResults.find(r => r.match.descriptor.name === 'line2');
    
    // Check that it was filled
    expect(filledResult?.status).toBe('filled');
    expect((document.getElementById('line2') as HTMLInputElement).value).toBe('Flat 4B');

    // Verify a rule was saved in store
    const rulesAfter = loadRules(location.hostname);
    const savedRule = rulesAfter.find(r => r.fingerprint === fp);
    expect(savedRule).toBeDefined();
    expect(['address.permanent.line1', 'address.permanent.line2']).toContain(savedRule?.key ?? '');
    expect(savedRule?.source).toBe('teach');
  });
});
