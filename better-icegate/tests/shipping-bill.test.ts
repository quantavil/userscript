import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { startShippingBillEnhancements } from '../src/shipping-bill/enhance';
import { setPaginationEnabled } from '../src/settings/pagination';

test('initializes delayed dates after navigating to Shipping Bill and switches pagination', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'MutationObserver', 'Event', 'Option'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, {
    window: browser, document: browser.document, location: browser.location,
    localStorage: browser.localStorage, MutationObserver: browser.MutationObserver,
    Event: browser.Event, Option: browser.Option,
  });
  try {
    startShippingBillEnhancements();
    browser.location.hash = '#/e-copy?docType=SB';
    browser.dispatchEvent(new browser.Event('hashchange'));
    browser.document.body.innerHTML = `<app-dec-layout>
      <input formcontrolname="fromDate" value="01-01-2026"><input formcontrolname="toDate">
      <app-dec-details><div class="paginator-container"><span class="info-page">Showing 1- 10 of 24</span><select name="perPage"><option value="10">10</option></select></div></app-dec-details>
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
    const paginator = browser.document.querySelector<HTMLElement>('.paginator-container')!;
    expect(paginator.hidden).toBe(true);
    setPaginationEnabled(true);
    expect(paginator.hidden).toBe(false);
    expect(select.value).toBe('10');
    setPaginationEnabled(false);
    expect(paginator.hidden).toBe(true);
    expect(info.textContent).toBe('Showing 1- 24 of 24');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});
