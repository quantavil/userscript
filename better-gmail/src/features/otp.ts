import { element } from '../core/dom';

const label = String.raw`\b(?:otp|one[- ]?time(?: password| code)?|verification|security|authentication|authorization|login|log-in|sign[- ]?in|passcode|pin|code)\b`;
const digits = String.raw`(?<![\d₹$€£.,+()-])(\d{4,8}|\d{3}[ -]\d{3})(?![\d%+()-]|[.,]\d)`;
const patterns = [
  /\bG-(\d{6})\b/,
  new RegExp(`${label}\\D{0,40}?${digits}`, 'i'),
  new RegExp(`${digits}\\s+(?:is|will be)\\s+(?:your|the)\\b[^.\\d]{0,30}${label}`, 'i'),
];

export function detectOtp(text: string): string | undefined {
  const flat = text.replace(/\s+/g, ' ');
  for (const pattern of patterns) {
    const code = pattern.exec(flat)?.[1]?.replace(/[ -]/g, '');
    if (code && !/^(?:19|20)\d\d$/.test(code)) return code;
  }
  return undefined;
}

export function syncOtp(
  line: HTMLElement,
  text: string,
  copy: (value: string) => Promise<void>,
): void {
  const code = detectOtp(text);
  let chip = line.querySelector<HTMLButtonElement>(':scope > .bgm-otp');
  if (!code) {
    chip?.remove();
    return;
  }
  if (!chip) {
    chip = element('button', 'bgm-otp');
    chip.type = 'button';
    chip.addEventListener('mousedown', (event) => event.stopPropagation());
    const button = chip;
    chip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const value = button.dataset.code;
      if (!value) return;
      void copy(value).then(
        () => {
          if (button.dataset.code !== value) return;
          button.textContent = 'Copied';
          button.setAttribute('aria-label', 'Copied');
          window.setTimeout(() => {
            if (button.dataset.code === value) {
              button.textContent = value;
              button.setAttribute('aria-label', `Copy code ${value}`);
            }
          }, 1500);
        },
        () => {
          button.title = 'Copy failed';
        },
      );
    });
    line.append(chip);
  }
  if (chip.dataset.code !== code) {
    chip.dataset.code = code;
    chip.textContent = code;
    chip.title = `Copy code ${code}`;
    chip.setAttribute('aria-label', `Copy code ${code}`);
  }
}
