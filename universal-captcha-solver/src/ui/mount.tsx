import { render } from 'preact';
import { UI_HOST_TAG } from '../dom/picker.ts';
import { PickerOverlay, Toasts } from './overlays.tsx';
import { SettingsDialog } from './settings.tsx';
import { SiteEditorDialog } from './site-editor.tsx';
import css from './styles.css' with { type: 'text' };
import { Widget } from './widget.tsx';

let mounted = false;

function App() {
  return (
    <>
      <Widget />
      <SettingsDialog />
      <SiteEditorDialog />
      <PickerOverlay />
      <Toasts />
    </>
  );
}

/** Lazily mounts the UI in a closed-off shadow root so page CSS can't leak in or out. */
export function mountUI(): void {
  if (mounted) return;
  mounted = true;
  const host = document.createElement(UI_HOST_TAG);
  const root = host.attachShadow({ mode: 'open' });
  try {
    // Constructable stylesheets are exempt from page CSP `style-src` rules.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
  } catch {
    root.append(Object.assign(document.createElement('style'), { textContent: css }));
  }
  document.documentElement.append(host);
  render(<App />, root);
}
