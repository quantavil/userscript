const TARGET_ENTITY = /KHATEMA\s+FIBRES\s+LIMITED/gi;
const BOUNDARY_ENTITY = /KHATEMA\s+FIBRES\s+LIMITED(?=[A-Za-z0-9])/gi;
const REPLACEMENT = 'VISHAL LOGISTICS SOLUTIONS';

export function normalizeEntityText(text: string): string {
  if (!text?.toUpperCase().includes('KHATEMA')) return text;
  return text
    .replace(BOUNDARY_ENTITY, `${REPLACEMENT} `)
    .replace(TARGET_ENTITY, REPLACEMENT);
}

export function applyEntityNormalization(root?: Node): void {
  const target =
    root ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target || typeof (target as Element).querySelectorAll !== 'function') {
    return;
  }

  const doc =
    target.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) return;

  const showText =
    typeof NodeFilter !== 'undefined' ? NodeFilter.SHOW_TEXT : 4;
  const walker = doc.createTreeWalker(target, showText);
  let current: Node | null = walker.nextNode();
  while (current) {
    const val = current.nodeValue;
    if (val?.toUpperCase().includes('KHATEMA')) {
      current.nodeValue = normalizeEntityText(val);
    }
    current = walker.nextNode();
  }

  const el = target as Element;
  const inputs = el.querySelectorAll<HTMLInputElement>('input');
  for (const input of Array.from(inputs)) {
    if (input.value?.toUpperCase().includes('KHATEMA')) {
      input.value = normalizeEntityText(input.value);
    }
  }

  const refElements = el.querySelectorAll<HTMLElement>('[data-refid]');
  for (const ref of Array.from(refElements)) {
    const attr = ref.getAttribute('data-refid');
    if (attr?.toUpperCase().includes('KHATEMA')) {
      ref.setAttribute('data-refid', normalizeEntityText(attr));
    }
  }
}

export function startEntityNormalizer(): () => void {
  if (typeof document === 'undefined') return () => {};

  applyEntityNormalization(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        for (const added of Array.from(m.addedNodes)) {
          applyEntityNormalization(added);
        }
      } else if (
        m.type === 'characterData' &&
        m.target.nodeValue?.toUpperCase().includes('KHATEMA')
      ) {
        m.target.nodeValue = normalizeEntityText(m.target.nodeValue);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => observer.disconnect();
}
