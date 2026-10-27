import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { startEsanchitCopy } from '../src/esanchit/copy';

const page = `<form><button id="modal" class="btn">Upload Documents</button><div class="divUpload"><table><tbody><tr>
  <input id="fileName_0" type="hidden" value="KPS AGRO FODD[signed].pdf">
  <td><a href="x"><textarea id="fileName_0" readonly>KPS AGRO FODD[signed].pdf</textarea></a></td>
  <td><input id="drn_0" readonly value="2026102700019579"></td>
  <td><input id="irn_0" readonly value="2026102700062887"></td>
  <td><input id="startDate_0" disabled value="2026-10-27 13:16:05"></td>
  <td><input id="digiSignValidated_0_0" disabled value="Successfully Verified"></td>
  <td><input id="docTypeSelect_0" readonly value="331000-Commercial invoice which includes a packing list"></td>
  <td><input id="deleteRecord_0" type="submit" value="Delete" disabled></td>
</tr><tr>
  <td><textarea id="fileName_1">b.pdf</textarea></td><td><input id="drn_1" value="D2"></td><td><input id="irn_1" value="I2"></td>
  <td><input id="startDate_1" value=""></td><td><input id="digiSignValidated_1_0" value=""></td>
  <td><select id="docTypeSelect_1"><option value="NONE">--- Select ---</option><option value="380000-Commercial Invoice" selected>380000-Commercial Invoice</option></select></td>
  <td><input id="deleteRecord_1" type="submit" value="Delete"></td>
</tr></tbody></table></div></form>`;

test('adds an email envelope per row and a copy-table button email template to each upload row', async () => {
  const browser = new Window({ url: 'https://www.icegate.gov.in/esanchit/home' });
  const keys = ['window', 'document', 'localStorage', 'MutationObserver', 'Event', 'navigator', 'requestAnimationFrame'];
  const previous = Object.fromEntries(keys.map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, {
    window: browser, document: browser.document, localStorage: browser.localStorage,
    MutationObserver: browser.MutationObserver, Event: browser.Event, navigator: browser.navigator,
    requestAnimationFrame: (fn: () => void) => setTimeout(fn, 0),
  });
  let copied = '';
  Object.defineProperty(browser.navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { copied = text; } } });
  try {
    browser.document.body.innerHTML = page;
    startEsanchitCopy();
    const rows = browser.document.querySelectorAll('tbody tr');
    expect(browser.document.querySelectorAll('.better-icegate-esanchit-tools')).toHaveLength(2);

    expect(rows[0].querySelectorAll('.better-icegate-esanchit-tools button')).toHaveLength(1);
    const mail = rows[0].querySelector<HTMLButtonElement>('.better-icegate-esanchit-tools button')!;
    mail.click(); await new Promise(resolve => setTimeout(resolve, 5));
    expect(copied).toBe('Dear Sir,\n\nFind below eSANCHIT upload details:\n\nDRN\tIRN\tFile Name\tDocument Type\n2026102700019579\t2026102700062887\tKPS AGRO FODD[signed].pdf\t331000-Commercial invoice which includes a packing list');

    const second = rows[1].querySelector<HTMLButtonElement>('.better-icegate-esanchit-tools button')!;
    second.click(); await new Promise(resolve => setTimeout(resolve, 5));
    expect(copied).toEndWith('D2\tI2\tb.pdf\t380000-Commercial Invoice');

    const copyTable = browser.document.querySelector<HTMLButtonElement>('#modal + .better-icegate-copy-table')!;
    const text = 'DRN {drn} / {status} / {date}';
    browser.localStorage.setItem('better-icegate.esanchit-template.v1', text);
    mail.click(); await new Promise(resolve => setTimeout(resolve, 5));
    expect(copied).toBe('DRN 2026102700019579 / Successfully Verified / 2026-10-27 13:16:05');
    expect(browser.document.querySelector('textarea[aria-label="eSANCHIT email template"]')).toBeNull();

    // Rows added later are enhanced once, without duplicating the button.
    const extra = browser.document.createElement('tr');
    extra.innerHTML = '<td><textarea id="fileName_2">c.pdf</textarea></td><td><input id="drn_2" value="D3"></td><td></td><td></td><td></td><td></td><td></td>';
    browser.document.querySelector('tbody')!.append(extra);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(browser.document.querySelectorAll('.better-icegate-esanchit-tools')).toHaveLength(3);
    expect(browser.document.querySelectorAll('.better-icegate-copy-table')).toHaveLength(1);
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});
