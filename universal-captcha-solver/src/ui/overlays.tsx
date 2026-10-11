import { useEffect, useRef } from 'preact/hooks';
import { cancelPick, pickerView } from '../dom/picker.ts';
import { dismissToast, toasts } from './state.ts';

export function PickerOverlay() {
  const view = pickerView.value;
  if (!view) return null;
  const { rect } = view;
  return (
    <>
      {rect && (
        <div
          class="pk-box"
          style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }}
        />
      )}
      <div class="pk-bar" role="status">
        <div class="top">
          <span>{view.prompt}</span>
          <button type="button" class="btn sm" onClick={cancelPick}>
            Cancel
          </button>
        </div>
        {view.selector ? (
          <div>
            <code>{view.selector}</code>{' '}
            <span class={`chip ${view.matches === 1 ? 'ok' : 'warn'}`}>
              {view.matches === 1 ? 'unique' : `${view.matches} matches`}
            </span>
          </div>
        ) : (
          <span class="hint">Hover the page, then click</span>
        )}
        {view.warning ? (
          <p class="err">{view.warning}</p>
        ) : (
          <p class="hint">↑ / ↓ widen or narrow the target · Esc cancels</p>
        )}
      </div>
    </>
  );
}

export function Toasts() {
  const list = toasts.value;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const open = el.matches(':popover-open');
    // Re-promote on every change so toasts always sit above an open modal dialog.
    if (open) el.hidePopover();
    if (list.length) el.showPopover();
  }, [list.length]);
  return (
    <div ref={ref} class="toasts" popover="manual" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} class={`toast ${t.kind}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
