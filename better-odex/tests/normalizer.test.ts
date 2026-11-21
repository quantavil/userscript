import { describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import {
  applyEntityNormalization,
  normalizeEntityText,
} from '../src/core/normalizer';
import { purgeLegacyFab } from '../src/styles/pageStyles';

describe('normalizer', () => {
  it('replaces exact entity name', () => {
    expect(normalizeEntityText('Consignee: KHATEMA FIBRES LIMITED')).toBe(
      'Consignee: VISHAL LOGISTICS SOLUTIONS',
    );
  });

  it('handles multiple whitespace variations', () => {
    expect(normalizeEntityText('KHATEMA   FIBRES   LIMITED')).toBe(
      'VISHAL LOGISTICS SOLUTIONS',
    );
  });

  it('handles tight boundary patterns with location suffix', () => {
    expect(normalizeEntityText('KHATEMA FIBRES LIMITEDMundra')).toBe(
      'VISHAL LOGISTICS SOLUTIONS Mundra',
    );
  });

  it('handles case-insensitivity', () => {
    expect(normalizeEntityText('khatema fibres limited')).toBe(
      'VISHAL LOGISTICS SOLUTIONS',
    );
  });

  it('leaves unaffected text unchanged', () => {
    expect(normalizeEntityText('SHREE CEMENT LIMITED')).toBe(
      'SHREE CEMENT LIMITED',
    );
  });

  it('applies entity normalization across DOM elements, inputs, and attributes', () => {
    const win = new Window({ url: 'https://odexglobal.com/newPyrVGM' });
    Object.assign(globalThis, {
      window: win,
      document: win.document,
      NodeFilter: win.NodeFilter,
    });
    win.document.body.innerHTML = `
      <div id="content">Shipper: KHATEMA FIBRES LIMITED</div>
      <input id="testInput" value="KHATEMA FIBRES LIMITED" />
      <span id="refSpan" data-refid="REF-KHATEMA FIBRES LIMITED-01">Info</span>
    `;

    applyEntityNormalization(win.document.body);

    expect(win.document.getElementById('content')?.textContent).toBe(
      'Shipper: VISHAL LOGISTICS SOLUTIONS',
    );
    expect(
      (win.document.getElementById('testInput') as HTMLInputElement).value,
    ).toBe('VISHAL LOGISTICS SOLUTIONS');
    expect(
      win.document.getElementById('refSpan')?.getAttribute('data-refid'),
    ).toBe('REF-VISHAL LOGISTICS SOLUTIONS-01');
  });

  it('purges legacy standalone FAB element if present', () => {
    const win = new Window({ url: 'https://odexglobal.com/newPyrVGM' });
    Object.assign(globalThis, {
      window: win,
      document: win.document,
    });
    win.document.body.innerHTML = `
      <div id="vls-evgm-pdf-fab-host"><button class="fab">Download</button></div>
    `;
    expect(win.document.getElementById('vls-evgm-pdf-fab-host')).not.toBeNull();
    purgeLegacyFab();
    expect(win.document.getElementById('vls-evgm-pdf-fab-host')).toBeNull();
  });
});
