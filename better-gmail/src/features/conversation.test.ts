import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { enhanceConversation } from './conversation';
import { observeUpdates } from '../core/observer';

beforeEach(() => document.body.replaceChildren());

test('collapses marked sections independently while keeping greetings and controls', () => {
  document.body.innerHTML =
    '<main role="main"><div class="adn" role="listitem"><div class="a3s"><p>Hello Alice,</p><p>Message</p><div class="gmail_signature">Regards, Bob</div><div class="gmail_quote">Old message</div></div><button>Reply</button><div download_url="file"></div></div><div class="adn" role="listitem"><div class="a3s"><p>Hi!</p><div class="gmail_signature">Thanks</div></div></div></main>';
  enhanceConversation(document);
  enhanceConversation(document);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.bgm-reveal')];
  expect(buttons.map((b) => b.textContent)).toEqual([
    'Show signature',
    'Show quoted text',
    'Show signature',
  ]);
  expect(document.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(true);
  expect(document.querySelector('p')?.textContent).toBe('Hello Alice,');
  const click = vi.fn();
  document.querySelector('.adn')!.addEventListener('click', click);
  buttons[0]!.click();
  expect(document.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(false);
  expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true');
  expect(click).not.toHaveBeenCalled();
  const keydown = vi.fn();
  document.querySelector('.adn')!.addEventListener('keydown', keydown);
  buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(keydown).not.toHaveBeenCalled();
  expect(document.querySelector('button:not(.bgm-reveal)')?.textContent).toBe('Reply');
  expect(document.querySelector('[download_url]')).not.toBeNull();
});

test('leaves ambiguous text, native hidden content and nested quoted signatures alone', () => {
  document.body.innerHTML =
    '<main role="main"><div class="adn"><div class="a3s"><p>Best regards,<br>Alice</p><div class="gmail_signature" hidden>Already hidden</div><div class="gmail_quote">Quote <div class="gmail_signature">quoted signature</div></div></div></div></main>';
  enhanceConversation(document);
  expect(document.querySelectorAll('.bgm-reveal')).toHaveLength(1);
  expect(document.querySelector('p')?.hasAttribute('hidden')).toBe(false);
});

test('processes changed or replaced bodies without rescanning inbox selections', async () => {
  document.body.innerHTML =
    '<main role="main"><div class="adn"><div class="a3s">First</div></div></main><table><tbody><tr class="zA"><td><span class="afn">Not selected</span></td></tr></tbody></table>';
  const update = vi.fn(enhanceConversation);
  const stop = observeUpdates(vi.fn(), update);
  document.querySelector('.afn')!.textContent = 'Selected';
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(update).not.toHaveBeenCalled();
  document.querySelector('.a3s')!.innerHTML = '<p>Hello</p><div class="gmail_quote">Old</div>';
  await vi.waitFor(() => expect(document.querySelector('.bgm-reveal')).not.toBeNull());
  expect(update).toHaveBeenCalledWith(document.querySelector('.a3s'));
  document.querySelector('.a3s')!.outerHTML =
    '<div class="a3s"><div class="gmail_signature">New</div></div>';
  await vi.waitFor(() =>
    expect(document.querySelector('.bgm-reveal')?.textContent).toBe('Show signature'),
  );
  stop();
});

test('leaves unmarked Outlook signatures and quoted history visible', () => {
  document.body.innerHTML =
    '<main role="main"><div class="adn"><div class="a3s"><div class="WordSection1"><p>Dear Sir,</p><p>Please send the number.</p><div id="signature"><p>Thanks and Warm Regards</p><p>Atul Kumar</p><p>Contact Detail- 91-8171777951</p></div><div id="history"><p><b>From:</b> Alice<br><b>Sent:</b> yesterday<br><b>To:</b> Bob<br><b>Subject:</b> Shipment</p><p>Earlier message</p></div></div></div></div></main>';
  enhanceConversation(document);
  expect(document.querySelector('#signature')?.hasAttribute('hidden')).toBe(false);
  expect(document.querySelector('#history')?.hasAttribute('hidden')).toBe(false);
  expect(document.querySelector('.bgm-reveal')).toBeNull();
});

test('disabling restores only script-collapsed content and reenabling processes the current thread', async () => {
  const { setConversationEnabled } = await import('./conversation');
  document.body.innerHTML =
    '<main role="main"><div class="adn"><div class="a3s"><div class="gmail_signature">Signature</div><div class="gmail_quote" hidden>Already hidden</div></div></div></main>';
  enhanceConversation(document);
  setConversationEnabled(false);
  expect(document.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(false);
  expect(document.querySelector('.gmail_quote')?.hasAttribute('hidden')).toBe(true);
  expect(document.querySelector('.bgm-reveal')).toBeNull();
  expect(document.querySelector('.bgm-conversation-message')).toBeNull();
  enhanceConversation(document);
  expect(document.querySelector('.bgm-reveal')).toBeNull();
  setConversationEnabled(true);
  expect(document.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(true);
  expect(document.querySelectorAll('.bgm-reveal')).toHaveLength(1);
});

test('restores a previously enhanced message that Gmail detaches and reinserts while disabled', async () => {
  const { setConversationEnabled } = await import('./conversation');
  document.body.innerHTML =
    '<main role="main"><div class="adn"><div class="a3s"><div class="gmail_signature">Signature</div></div></div></main>';
  enhanceConversation(document);
  const message = document.querySelector<HTMLElement>('.adn')!;
  message.remove();
  setConversationEnabled(false);
  document.querySelector('main')!.append(message);
  enhanceConversation(message.querySelector<HTMLElement>('.a3s')!);
  expect(message.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(false);
  expect(message.querySelector('.bgm-reveal')).toBeNull();
  expect(message.classList.contains('bgm-conversation-message')).toBe(false);
  setConversationEnabled(true);
});
