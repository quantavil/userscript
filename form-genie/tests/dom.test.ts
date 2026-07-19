import { describe, it, expect, beforeEach } from 'bun:test';
import { scan } from '../src/engine/scan';
import { describe as describeField } from '../src/engine/describe';
import { matchAll } from '../src/engine/match';
import { fillAll } from '../src/engine/fill';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('scan', () => {
  beforeEach(() => setBody(''));

  it('skips password, hidden, and captcha/OTP fields', () => {
    setBody(`
      <input name="email" type="email">
      <input name="pw" type="password">
      <input name="csrf" type="hidden">
      <input name="otp" placeholder="Enter OTP">
      <input name="captcha">
    `);
    const names = scan().map((u) => u.el.getAttribute('name'));
    expect(names).toContain('email');
    expect(names).not.toContain('pw');
    expect(names).not.toContain('csrf');
    expect(names).not.toContain('otp');
    expect(names).not.toContain('captcha');
  });

  it('groups radios by name', () => {
    setBody(`
      <label><input type="radio" name="g" value="Male">Male</label>
      <label><input type="radio" name="g" value="Female">Female</label>
    `);
    const units = scan();
    const radio = units.find((u) => u.type === 'radio');
    expect(radio?.group.length).toBe(2);
  });
});

describe('describe — table layout labels', () => {
  it('reads label from preceding table cell', () => {
    setBody(`<table><tr><td>Father's Name</td><td><input name="fn"></td></tr></table>`);
    const unit = scan()[0];
    const d = describeField(unit);
    expect(d.text).toContain('father');
  });
});

describe('fill — framework-safe + constraints', () => {
  it('fills text input and fires input/change events', async () => {
    setBody(`<label for="fn">Full Name</label><input id="fn" name="fn">`);
    const el = document.getElementById('fn') as HTMLInputElement;
    let inputFired = false, changeFired = false;
    el.addEventListener('input', () => (inputFired = true));
    el.addEventListener('change', () => (changeFired = true));

    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'personal.fullName': 'Ravi Sharma' }, { overwrite: false });

    expect(el.value).toBe('Ravi Sharma');
    expect(inputFired).toBe(true);
    expect(changeFired).toBe(true);
  });

  it('selects a matching option (OBC equivalence)', async () => {
    setBody(`
      <label for="c">Category</label>
      <select id="c" name="c">
        <option value="">Select</option>
        <option>General</option><option>OBC-NCL</option><option>SC</option>
      </select>`);
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'personal.category': 'OBC' }, { overwrite: false });
    expect((document.getElementById('c') as HTMLSelectElement).value).toBe('OBC-NCL');
  });

  it('skips values exceeding maxlength instead of truncating', async () => {
    setBody(`<label for="p">PIN Code</label><input id="p" name="p" maxlength="6">`);
    const matches = matchAll(scan().map(describeField), []);
    const results = await fillAll(matches, { 'address.permanent.pincode': '1234567' }, { overwrite: false });
    const el = document.getElementById('p') as HTMLInputElement;
    expect(el.value).toBe('');
    expect(results.find((r) => r.match.key === 'address.permanent.pincode')?.status).toBe('skipped');
  });

  it('strips +91 from mobile when maxlength is 10', async () => {
    setBody(`<label for="m">Mobile Number</label><input id="m" name="m" maxlength="10">`);
    const matches = matchAll(scan().map(describeField), []);
    await fillAll(matches, { 'contact.mobile': '+91 98765 43210' }, { overwrite: false });
    expect((document.getElementById('m') as HTMLInputElement).value).toBe('9876543210');
  });

  it('waits for cascading child options before filling (state → district)', async () => {
    setBody(`
      <label for="s">State</label>
      <select id="s" name="s"><option value="">Select</option><option>Bihar</option><option>Delhi</option></select>
      <label for="d">District</label>
      <select id="d" name="d" disabled><option value="">Select</option></select>`);
    const s = document.getElementById('s') as HTMLSelectElement;
    const d = document.getElementById('d') as HTMLSelectElement;
    s.addEventListener('change', () => {
      setTimeout(() => {
        d.innerHTML = '<option value="">Select</option><option>Central</option><option>North</option>';
        d.disabled = false;
      }, 150);
    });
    // District maps to permanent district; parent state fills first, then we wait.
    const rules = [{ fingerprint: 'n:d', occurrence: 0, key: 'address.permanent.district', source: 'teach' as const, ts: 0 }];
    const matches = matchAll(scan().map(describeField), rules);
    await fillAll(matches, { 'address.permanent.state': 'Bihar', 'address.permanent.district': 'North' }, { overwrite: false });
    expect(s.value).toBe('Bihar');
    expect(d.value).toBe('North');
  });
});
