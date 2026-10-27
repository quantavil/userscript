import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { startShippingBillEnhancements } from '../src/shipping-bill/enhance';
import { setPaginationEnabled } from '../src/settings/pagination';

test('initializes delayed dates after navigating to Shipping Bill and switches pagination', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'MutationObserver', 'Event', 'Element'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, {
    window: browser, document: browser.document, location: browser.location,
    localStorage: browser.localStorage, MutationObserver: browser.MutationObserver,
    Event: browser.Event, Element: browser.Element,
  });
  try {
    startShippingBillEnhancements();
    browser.location.hash = '#/e-copy?docType=SB';
    browser.dispatchEvent(new browser.Event('hashchange'));
    browser.document.body.innerHTML = `<app-dec-layout>
      <input formcontrolname="fromDate" value="01-01-2026"><input formcontrolname="toDate">
      <app-dec-details><div><table class="resultTable"><thead><tr><td>Job Number</td><td>Job Date</td><td>SB Number</td><td>SB Date</td><td>Location</td></tr></thead><tbody><tr><td>123</td><td>27-10-2026</td><td>456</td><td>27-10-2026</td><td>INMBD6</td></tr><tr><td>789</td><td>27-10-2026</td><td>321</td><td>27-10-2026</td><td>INDER6</td></tr></tbody></table></div><div class="paginator-container"><span class="info-page">Showing 1- 10 of 24</span><select name="perPage"><option value="10">10</option></select></div></app-dec-details>
    </app-dec-layout>`;
    const from = browser.document.querySelector<HTMLInputElement>('[formcontrolname="fromDate"]')!;
    const to = browser.document.querySelector<HTMLInputElement>('[formcontrolname="toDate"]')!;
    let formChanges = 0;
    from.addEventListener('input', () => formChanges++);
    const select = browser.document.querySelector<HTMLSelectElement>('select')!;
    const info = browser.document.querySelector('.info-page')!;
    select.addEventListener('change', () => { info.textContent = select.value === '10' ? 'Showing 1- 10 of 24' : 'Showing 1- 24 of 24'; });
    // Value assignment does not produce a DOM mutation.
    await new Promise(resolve => setTimeout(resolve, 20));
    to.value = '27-10-2026';
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(from.value).toBe('27-10-2026');
    expect(formChanges).toBe(1);
    const search = browser.document.querySelector<HTMLInputElement>('.better-icegate-results input')!;
    const copyButtons = browser.document.querySelectorAll<HTMLButtonElement>('.better-icegate-copy');
    expect(copyButtons).toHaveLength(8);
    expect(copyButtons[0].getAttribute('aria-label')).toBe('Copy job number');
    expect(copyButtons[1].getAttribute('aria-label')).toBe('Copy SB number');
    expect(copyButtons[2].getAttribute('aria-label')).toBe('Copy SB date');
    expect(copyButtons[3].getAttribute('aria-label')).toBe('Copy custom location');
    const templateButtons = browser.document.querySelectorAll<HTMLButtonElement>('.better-icegate-template');
    expect(templateButtons).toHaveLength(2);
    let clipboard = '';
    Object.defineProperty(browser.navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { clipboard = text; } } });
    Object.assign(globalThis, { navigator: browser.navigator });
    templateButtons[0].click();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(clipboard).toBe('Dear Sir,\n\nFind below Shipping Bill Number:\n\nJob No\tSB Number\tSB Date\n123\t456\t27-10-2026');
    expect(browser.document.querySelector('table.resultTable tbody tr td')!.textContent).toContain('123');
    const items: Record<string, Blob>[] = [];
    Object.assign(globalThis, { ClipboardItem: class { constructor(public data: Record<string, Blob>) { items.push(data); } } });
    (browser.navigator.clipboard as any).write = async () => {};
    templateButtons[1].click();
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(Object.keys(items[0])).toEqual(['text/html', 'text/plain']);
    expect(await items[0]['text/html'].text()).toContain('<table border="1"');
    delete (globalThis as any).ClipboardItem;
    delete (browser.navigator.clipboard as any).write;
    search.value = 'INMBD6';
    search.dispatchEvent(new browser.Event('input'));
    const rows = browser.document.querySelectorAll<HTMLTableRowElement>('table.resultTable tbody tr');
    expect(rows[0].hidden).toBe(false);
    expect(rows[1].hidden).toBe(true);
    const paginator = browser.document.querySelector<HTMLElement>('.paginator-container')!;
    expect(paginator.hidden).toBe(true);
    setPaginationEnabled(true);
    expect(paginator.hidden).toBe(false);
    expect(select.value).toBe('10');
    setPaginationEnabled(false);
    expect(paginator.hidden).toBe(true);
    expect(info.textContent).toBe('Showing 1- 24 of 24');
    info.textContent = 'Showing 1- 10 of 24';
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(paginator.hidden).toBe(false);
    info.textContent = 'Showing 1- 24 of 24';
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(paginator.hidden).toBe(true);
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});

test('date preset selection follows manual date changes', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/e-copy?docType=SB' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'MutationObserver', 'Event', 'Element'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, { window: browser, document: browser.document, location: browser.location, localStorage: browser.localStorage, MutationObserver: browser.MutationObserver, Event: browser.Event, Element: browser.Element });
  try {
    browser.document.body.innerHTML = '<app-dec-layout><form><input formcontrolname="fromDate"><input formcontrolname="toDate" value="01-01-2026"></form></app-dec-layout>';
    startShippingBillEnhancements();
    const today = browser.document.querySelector<HTMLButtonElement>('[data-preset="today"]')!;
    today.click();
    expect(today.getAttribute('aria-pressed')).toBe('true');
    const from = browser.document.querySelector<HTMLInputElement>('[formcontrolname="fromDate"]')!;
    from.value = '01-01-2020';
    from.dispatchEvent(new browser.Event('change', { bubbles: true }));
    expect(today.getAttribute('aria-pressed')).toBe('false');
    today.click();
    from.value = '01-01-2020';
    browser.document.body.append(browser.document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(today.getAttribute('aria-pressed')).toBe('false');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});

test('result tools follow replaced tables and updated cells', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/e-copy?docType=SB' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'MutationObserver', 'Event', 'Element', 'navigator'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, { window: browser, document: browser.document, location: browser.location, localStorage: browser.localStorage, MutationObserver: browser.MutationObserver, Event: browser.Event, Element: browser.Element, navigator: browser.navigator });
  let copied = '';
  Object.defineProperty(browser.navigator, 'clipboard', { value: { writeText: async (value: string) => { copied = value; } }, configurable: true });
  try {
    browser.document.body.innerHTML = '<app-dec-layout><app-dec-details><div><table class="resultTable"><tbody><tr><td>old</td><td></td><td>sb</td></tr></tbody></table></div></app-dec-details></app-dec-layout>';
    startShippingBillEnhancements();
    const oldTable = browser.document.querySelector('table')!;
    oldTable.outerHTML = '<table class="resultTable"><tbody><tr><td>new</td><td></td><td>sb</td></tr><tr><td>other</td><td></td><td>sb2</td></tr></tbody></table>';
    await new Promise(resolve => setTimeout(resolve, 20));
    const filter = browser.document.querySelector<HTMLInputElement>('.better-icegate-filter')!;
    filter.value = 'new'; filter.dispatchEvent(new browser.Event('input'));
    const rows = browser.document.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows[0].hidden).toBe(false);
    expect(rows[1].hidden).toBe(true);
    rows[0].cells[0].firstChild!.textContent = 'changed';
    rows[0].cells[0].querySelector<HTMLButtonElement>('button')!.click();
    await Promise.resolve();
    expect(copied).toBe('changed');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});

test('copies job number, SB number, SB date, and custom location to clipboard', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/e-copy?docType=SB' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'MutationObserver', 'Event', 'Element', 'navigator'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, { window: browser, document: browser.document, location: browser.location, localStorage: browser.localStorage, MutationObserver: browser.MutationObserver, Event: browser.Event, Element: browser.Element, navigator: browser.navigator });
  let copied = '';
  Object.defineProperty(browser.navigator, 'clipboard', { value: { writeText: async (value: string) => { copied = value; } }, configurable: true });
  try {
    browser.document.body.innerHTML = `<app-dec-layout><app-dec-details><div>
      <table class="resultTable">
        <thead><tr><th>Job Number</th><th>Job Date</th><th>SB Number</th><th>SB Date</th><th>Location</th></tr></thead>
        <tbody><tr><td>JOB101</td><td>20-10-2026</td><td>SB202</td><td>21-10-2026</td><td>INNSA1</td></tr></tbody>
      </table>
    </div></app-dec-details></app-dec-layout>`;
    startShippingBillEnhancements();
    const row = browser.document.querySelector<HTMLTableRowElement>('tbody tr')!;
    const buttons = row.querySelectorAll<HTMLButtonElement>('.better-icegate-copy');
    expect(buttons).toHaveLength(4);

    buttons[0].click();
    await Promise.resolve();
    expect(copied).toBe('JOB101');
    expect(buttons[0].getAttribute('aria-label')).toBe('Copy job number');

    buttons[1].click();
    await Promise.resolve();
    expect(copied).toBe('SB202');
    expect(buttons[1].getAttribute('aria-label')).toBe('Copy SB number');

    buttons[2].click();
    await Promise.resolve();
    expect(copied).toBe('21-10-2026');
    expect(buttons[2].getAttribute('aria-label')).toBe('Copy SB date');

    buttons[3].click();
    await Promise.resolve();
    expect(copied).toBe('INNSA1');
    expect(buttons[3].getAttribute('aria-label')).toBe('Copy custom location');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});
