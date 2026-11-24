import { beforeEach, describe, expect, test } from 'vite-plus/test';
import { buildPrintDocument, collectPrintThread } from './print';

beforeEach(() => {
  document.body.replaceChildren();
});

function setThread(messages: string): void {
  document.body.innerHTML = `<main role="main"><h2 class="hP">Shipment docs</h2>${messages}</main>`;
}

describe('print expanded thread', () => {
  test('collects only expanded messages with their sender, address and date', () => {
    setThread(`
      <div class="adn">
        <span class="gD" email="alice@example.com">Alice</span>
        <span class="g3" title="Nov 24, 2026, 10:00 AM">10:00</span>
        <div class="a3s"><p>First</p></div>
      </div>
      <div class="adn">
        <span class="gD" email="bob@example.com">Bob</span>
        <div class="a3s" style="display: none"><p>Collapsed</p></div>
      </div>
      <div class="adn">
        <span class="gD" email="carol@example.com">Carol</span>
        <div class="a3s"><p>Third</p></div>
      </div>
    `);

    const thread = collectPrintThread();
    expect(thread?.subject).toBe('Shipment docs');
    expect(thread?.messages.map((message) => message.sender)).toEqual(['Alice', 'Carol']);
    expect(thread?.messages[0]).toMatchObject({
      email: 'alice@example.com',
      date: 'Nov 24, 2026, 10:00 AM',
    });
  });

  test('prints the full content of a message the userscript compacted', () => {
    setThread(`
      <div class="adn">
        <div class="a3s">
          <p>Hello</p>
          <button class="bgm-reveal">Show signature</button>
          <div class="gmail_signature bgm-collapsed-section" hidden>Regards</div>
        </div>
      </div>
    `);

    const thread = collectPrintThread();
    const body = thread?.messages[0]?.body;
    expect(body?.querySelector('.bgm-reveal')).toBeNull();
    expect(body?.querySelector('.bgm-collapsed-section')).toBeNull();
    expect(body?.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('.bgm-reveal')).not.toBeNull();
    expect(document.querySelector('.gmail_signature')?.hasAttribute('hidden')).toBe(true);
  });

  test('returns null for an inbox or a thread where every message is collapsed', () => {
    expect(collectPrintThread()).toBeNull();
    setThread(`
      <div class="adn">
        <div class="a3s" style="display: none"><p>Hidden</p></div>
      </div>
    `);
    expect(collectPrintThread()).toBeNull();
  });

  test('drops scripts and interactive controls from the printed body', () => {
    setThread(`
      <div class="adn">
        <div class="a3s">
          <p onclick="alert(1)">Hello</p>
          <script>alert(1)</script>
          <button>Reply</button>
          <a href="https://example.com">Link</a>
        </div>
      </div>
    `);

    const body = collectPrintThread()?.messages[0]?.body;
    expect(body?.querySelector('script')).toBeNull();
    expect(body?.querySelector('button')).toBeNull();
    expect(body?.querySelector('[onclick]')).toBeNull();
    expect(body?.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
  });

  test('builds a self-contained print document with one section per message', () => {
    setThread(`
      <div class="adn">
        <span class="gD" email="alice@example.com">Alice</span>
        <span class="g3">Today</span>
        <div class="a3s"><p>Hello</p></div>
      </div>
    `);
    const thread = collectPrintThread();
    expect(thread).not.toBeNull();

    const printDoc = document.implementation.createHTMLDocument('');
    buildPrintDocument(printDoc, thread!);
    expect(printDoc.title).toBe('Shipment docs');
    expect(printDoc.querySelector('h1')?.textContent).toBe('Shipment docs');
    expect(printDoc.querySelector('.bgm-print-count')?.textContent).toBe('1 expanded message');
    expect(printDoc.querySelector('.bgm-print-from strong')?.textContent).toBe('Alice');
    expect(printDoc.querySelector('.bgm-print-email')?.textContent).toBe('alice@example.com');
    expect(printDoc.querySelector('.bgm-print-date')?.textContent).toBe('Today');
    expect(printDoc.querySelector('.bgm-print-body p')?.textContent).toBe('Hello');
  });
});
