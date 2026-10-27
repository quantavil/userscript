import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { parseDocType, pushRecent, readRecent, searchDocTypes } from '../src/esanchit/search';
import { startDocumentTypeDropdown } from '../src/esanchit/dropdown';

const options = [
  ['001000', 'Certificate of analysis'], ['331000', 'Commercial invoice which includes a packing list'],
  ['271000', 'Packing list'], ['380000', 'Commercial Invoice'], ['705000', 'Bill of lading'],
  ['011000', ' Federal label approval'],
].map(([code, label]) => parseDocType(`${code}-${label}`, `${code}-${label}`)!);

test('parses document types and ignores the placeholder', () => {
  expect(parseDocType('NONE', '--- Select ---')).toBeNull();
  expect(options[5]).toEqual({ value: '011000- Federal label approval', code: '011000', label: 'Federal label approval' });
});

test('ranks code and word-start matches ahead of substrings and requires every word', () => {
  expect(searchDocTypes(options, '').length).toBe(6);
  expect(searchDocTypes(options, '38').map(item => item.code)).toEqual(['380000']);
  expect(searchDocTypes(options, 'invoice').map(item => item.code)).toEqual(['331000', '380000']);
  expect(searchDocTypes(options, 'comm inv pack').map(item => item.code)).toEqual(['331000']);
  expect(searchDocTypes(options, 'list pack').map(item => item.code)).toEqual(['271000', '331000']);
  expect(searchDocTypes(options, 'zzz')).toEqual([]);
});

test('keeps a short most-recent-first list and tolerates bad storage', () => {
  expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'c')).toEqual(['c', 'a', 'b', 'd', 'e']);
  expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  expect(readRecent('not json')).toEqual([]);
  expect(readRecent('[1,"a"]')).toEqual(['a']);
});

test('replaces the select with a searchable combobox that drives the native select', async () => {
  const browser = new Window({ url: 'https://www.icegate.gov.in/esanchit/home' });
  const keys = ['window', 'document', 'localStorage', 'MutationObserver', 'Event', 'requestAnimationFrame'];
  const previous = Object.fromEntries(keys.map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, {
    window: browser, document: browser.document, localStorage: browser.localStorage,
    MutationObserver: browser.MutationObserver, Event: browser.Event,
    requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0),
  });
  try {
    browser.document.body.innerHTML = `<form><select id="docTypeSelect_1" class="dropdown1"><option value="NONE">--- Select ---</option>${options.map(o => `<option value="${o.value}">${o.value}</option>`).join('')}</select></form>`;
    startDocumentTypeDropdown();
    const select = browser.document.querySelector<HTMLSelectElement>('select')!;
    let changes = 0;
    select.addEventListener('change', () => changes++);
    const input = browser.document.querySelector<HTMLInputElement>('input.better-icegate-doctype')!;
    expect(input).toBeTruthy();
    expect(select.style.display).toBe('none');

    input.dispatchEvent(new browser.Event('focus'));
    input.value = 'pack';
    input.dispatchEvent(new browser.Event('input', { bubbles: true }));
    const rows = browser.document.querySelectorAll('.better-icegate-doclist [role="option"]');
    expect(rows.length).toBe(2);
    input.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(select.value).toBe('271000-Packing list');
    expect(changes).toBe(1);
    expect(input.value).toBe('271000-Packing list');
    expect(JSON.parse(browser.localStorage.getItem('better-icegate.esanchit-recent.v1')!)).toEqual(['271000-Packing list']);

    select.value = 'NONE';
    select.dispatchEvent(new browser.Event('change', { bubbles: true }));
    expect(input.value).toBe('');
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(browser.document.querySelectorAll('input.better-icegate-doctype').length).toBe(1);
  } finally {
    Object.assign(globalThis, previous);
  }
});
