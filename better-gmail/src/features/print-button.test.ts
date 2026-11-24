import { beforeEach, expect, test } from 'vite-plus/test';
import { ensurePrintButton } from './print-button';

beforeEach(() => {
  document.body.replaceChildren();
});

test('adds one print button beside the thread subject', () => {
  document.body.innerHTML =
    '<main role="main"><h2 class="hP">Shipment docs</h2><div class="adn"><div class="a3s"><p>Hello</p></div></div></main>';
  ensurePrintButton();
  ensurePrintButton();
  const buttons = document.querySelectorAll<HTMLButtonElement>('.bgm-print-button');
  expect(buttons).toHaveLength(1);
  expect(buttons[0]?.textContent).toBe('Print');
  expect(buttons[0]?.getAttribute('aria-label')).toBe('Print expanded messages');
  expect(document.querySelector('h2')?.nextElementSibling).toBe(buttons[0]);
});

test('reports when no expanded message remains', () => {
  document.body.innerHTML =
    '<main role="main"><h2 class="hP">Shipment docs</h2><div class="adn"><div class="a3s" style="display: none">Hidden</div></div></main>';
  ensurePrintButton();
  document.querySelector<HTMLButtonElement>('.bgm-print-button')?.click();
  expect(document.querySelector('.bgm-copy-notice')?.textContent).toBe('Open a message to print');
});
