import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { render } from 'preact';
import { Panel } from '../src/ui/Panel';

test('opens shortcut in same tab when text is clicked and new tab when arrow is clicked', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'Event', 'Element', 'open'].map(key => [key, (globalThis as any)[key]]));
  
  let openedUrl = '';
  let openedTarget = '';
  const mockOpen = (url: string, target: string) => {
    openedUrl = url;
    openedTarget = target;
    return null;
  };
  Object.defineProperty(browser, 'open', { value: mockOpen, configurable: true, writable: true });

  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    location: browser.location,
    localStorage: browser.localStorage,
    Event: browser.Event,
    Element: browser.Element,
    open: mockOpen,
  });

  try {
    const root = browser.document.createElement('div');
    browser.document.body.append(root);
    render(<Panel />, root);

    const rows = browser.document.querySelectorAll('.row');
    expect(rows.length).toBeGreaterThanOrEqual(3);

    // Row 1 is Shipping Bill (or index 1, defaults: esanchit, shipping-bill, file-upload)
    const sbRow = rows[1];
    const textButton = sbRow.querySelector<HTMLButtonElement>('.shortcut')!;
    const arrowButton = sbRow.querySelector<HTMLButtonElement>('.arrow-btn')!;

    expect(textButton).not.toBeNull();
    expect(arrowButton).not.toBeNull();
    expect(textButton.textContent).toContain('Shipping Bill / SB');
    expect(arrowButton.textContent).toContain('↗');
    expect(textButton.getAttribute('title')).toBe('Open Shipping Bill / SB');
    expect(arrowButton.getAttribute('title')).toBe('Open Shipping Bill / SB in a new tab');
    expect(arrowButton.getAttribute('aria-label')).toBe('Open Shipping Bill / SB in a new tab');

    // Clicking arrow opens in a new tab
    arrowButton.click();
    expect(openedUrl).toBe('https://foservices.icegate.gov.in/#/e-copy?docType=SB');
    expect(openedTarget).toBe('_blank');

    // Clicking text navigates in the current tab
    textButton.click();
    expect(browser.location.href).toBe('https://foservices.icegate.gov.in/#/e-copy?docType=SB');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});

test('handles eSANCHIT same tab and new tab actions', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/e-copy?docType=SB' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'Event', 'Element', 'open'].map(key => [key, (globalThis as any)[key]]));
  
  let openedUrl = '';
  let openedTarget = '';
  const mockOpen = (url: string, target: string) => {
    openedUrl = url;
    openedTarget = target;
    return null;
  };
  Object.defineProperty(browser, 'open', { value: mockOpen, configurable: true, writable: true });

  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    location: browser.location,
    localStorage: browser.localStorage,
    Event: browser.Event,
    Element: browser.Element,
    open: mockOpen,
  });

  try {
    const root = browser.document.createElement('div');
    browser.document.body.append(root);
    render(<Panel />, root);

    const esanchitRow = browser.document.querySelectorAll('.row')[0];
    const textButton = esanchitRow.querySelector<HTMLButtonElement>('.shortcut')!;
    const arrowButton = esanchitRow.querySelector<HTMLButtonElement>('.arrow-btn')!;

    // Clicking arrow from a non-dashboard page opens dashboard tab for handoff
    arrowButton.click();
    expect(openedUrl).toContain('https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView');
    expect(openedTarget).toMatch(/^better-icegate-esanchit-\d+$/);

    // Clicking text sets window.name and navigates current tab to dashboard
    textButton.click();
    expect(browser.name).toMatch(/^better-icegate-esanchit-\d+$/);
    expect(browser.location.href).toBe('https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView');
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});

test('edits and resets the Shipping Bill email template in settings', async () => {
  const browser = new Window({ url: 'https://foservices.icegate.gov.in/#/role-dashboard/role-dashboardView' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'localStorage', 'Event', 'Element'].map(key => [key, (globalThis as any)[key]]));
  Object.assign(globalThis, { window: browser, document: browser.document, location: browser.location, localStorage: browser.localStorage, Event: browser.Event, Element: browser.Element });
  try {
    const root = browser.document.createElement('div');
    browser.document.body.append(root);
    render(<Panel />, root);
    browser.document.querySelector<HTMLButtonElement>('[aria-label="Settings"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 5));
    const input = browser.document.querySelector<HTMLTextAreaElement>('#sb-template')!;
    expect(input.value).toContain('Find below Shipping Bill Number:');
    input.value = 'SB {sb} dated {date}';
    input.dispatchEvent(new browser.Event('input', { bubbles: true }));
    expect(browser.localStorage.getItem('better-icegate.sb-template.v1')).toBe('SB {sb} dated {date}');
    browser.document.querySelector<HTMLButtonElement>('.restore')!.click();
    expect(browser.localStorage.getItem('better-icegate.sb-template.v1')).toBeNull();
    const be = browser.document.querySelector<HTMLTextAreaElement>('#be-template')!;
    expect(be.value).toContain('Job No{tab}BE Number{tab}BE Date{tab}Custom Location');
    be.value = 'BE {be} at {location}';
    be.dispatchEvent(new browser.Event('input', { bubbles: true }));
    expect(browser.localStorage.getItem('better-icegate.be-template.v1')).toBe('BE {be} at {location}');
    browser.document.querySelectorAll<HTMLButtonElement>('.restore')[1].click();
    expect(browser.localStorage.getItem('better-icegate.be-template.v1')).toBeNull();
    const esanchit = browser.document.querySelector<HTMLTextAreaElement>('#esanchit-template')!;
    expect(esanchit.value).toContain('Find below the IRN and DRN details:');
    esanchit.value = 'DRN {drn}';
    esanchit.dispatchEvent(new browser.Event('input', { bubbles: true }));
    expect(browser.localStorage.getItem('better-icegate.esanchit-template.v1')).toBe('DRN {drn}');
    browser.document.querySelectorAll<HTMLButtonElement>('.restore')[2].click();
    expect(browser.localStorage.getItem('better-icegate.esanchit-template.v1')).toBeNull();
  } finally {
    await browser.happyDOM.abort();
    Object.assign(globalThis, previous);
  }
});
