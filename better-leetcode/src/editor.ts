import { unsafeWindow } from '$';

/** Language label shown in the editor toolbar, e.g. "Rust", "C++", "Python3". */
export function languageLabel(): string | null {
  const btn = document.querySelector<HTMLElement>('#editor button[aria-haspopup="dialog"]');
  return btn?.textContent?.trim() || null;
}

export interface EditorCode {
  code: string;
  monacoLang: string | null;
  /** true when only the currently rendered lines could be read (Monaco API unreachable) */
  partial: boolean;
}

interface MonacoModel {
  getValue(): string;
  getLanguageId?(): string;
}
interface MonacoEditor {
  getContainerDomNode?(): HTMLElement;
  getModel?(): MonacoModel | null;
}
type MonacoGlobal = { editor?: { getEditors?(): MonacoEditor[] } };

export function readCode(): EditorCode | null {
  try {
    const monaco = (unsafeWindow as unknown as { monaco?: MonacoGlobal }).monaco;
    const editors = monaco?.editor?.getEditors?.() ?? [];
    const main = editors.find((e) => e.getContainerDomNode?.()?.closest('#editor'));
    const model = main?.getModel?.();
    if (model) return { code: model.getValue(), monacoLang: model.getLanguageId?.() ?? null, partial: false };
  } catch {
    /* fall through to the DOM */
  }

  // Monaco virtualises its viewport, so this only sees what is on screen.
  const lines = Array.from(document.querySelectorAll<HTMLElement>('#editor .view-line'));
  if (!lines.length) return null;
  const code = lines
    .sort((a, b) => Number.parseFloat(a.style.top) - Number.parseFloat(b.style.top))
    .map((l) => (l.textContent ?? '').replace(/\u00a0/g, ' '))
    .join('\n');
  return { code, monacoLang: null, partial: true };
}
