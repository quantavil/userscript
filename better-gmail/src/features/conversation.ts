import { selectors } from '../selectors';

const sections = '.gmail_signature, .gmail_quote';
const controls = new WeakMap<Element, HTMLButtonElement>();
let enabled = true;

function enhanceBody(body: HTMLElement): void {
  if (!body.closest('[role="main"]')) return;
  body.closest('.adn')?.classList.add('bgm-conversation-message');
  const candidates = body.querySelectorAll<HTMLElement>(sections);
  for (const section of candidates) {
    if (section.parentElement?.closest(`${sections}, .bgm-collapsed-section`)) continue;
    const existing = controls.get(section);
    if (existing?.isConnected) continue;
    if (section.hidden && !existing) continue;
    const kind = section.matches('.gmail_quote') ? 'quoted text' : 'signature';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bgm-reveal';
    button.textContent = `Show ${kind}`;
    button.setAttribute('aria-expanded', 'false');
    section.classList.add('bgm-collapsed-section');
    section.hidden = true;
    section.before(button);
    controls.set(section, button);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      section.hidden = !section.hidden;
      button.setAttribute('aria-expanded', String(!section.hidden));
      button.textContent = `${section.hidden ? 'Show' : 'Hide'} ${kind}`;
    });
  }
}

export function enhanceConversation(root: ParentNode): void {
  if (!enabled) {
    restoreConversation(root);
    return;
  }
  if (root instanceof HTMLElement && root.matches(selectors.messageBody)) enhanceBody(root);
  for (const body of root.querySelectorAll<HTMLElement>(selectors.messageBody)) enhanceBody(body);
}

export function setConversationEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  if (enabled) {
    enhanceConversation(document);
    return;
  }
  restoreConversation(document);
}

function restoreConversation(root: ParentNode): void {
  for (const section of root.querySelectorAll<HTMLElement>('.bgm-collapsed-section')) {
    const button = controls.get(section);
    if (!button) continue;
    section.hidden = false;
    section.classList.remove('bgm-collapsed-section');
    button.remove();
    controls.delete(section);
  }
  if (root instanceof HTMLElement) {
    root.closest('.bgm-conversation-message')?.classList.remove('bgm-conversation-message');
  }
  for (const message of root.querySelectorAll('.bgm-conversation-message')) {
    message.classList.remove('bgm-conversation-message');
  }
}
