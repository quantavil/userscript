import { useRef } from 'preact/hooks';
import { controller, store } from '../app.ts';
import { Icon } from './icons.tsx';
import { settingsTab, toast } from './state.ts';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, Math.max(lo, hi)));

export function Widget() {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  const match = controller.match.value;
  if (!match) return null;
  const { status } = controller;
  const st = status.value;
  const ui = store.settings.value.ui;
  const disabled = !match.rule.enabled;

  const onDown = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    const d = drag.current;
    if (!el || !d) return;
    d.moved ||= Math.hypot(e.movementX, e.movementY) > 0;
    const x = clamp(e.clientX - d.dx, 4, innerWidth - el.offsetWidth - 4);
    const y = clamp(e.clientY - d.dy, 4, innerHeight - el.offsetHeight - 4);
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
  };
  const onUp = () => {
    const el = ref.current;
    const d = drag.current;
    drag.current = null;
    if (!el || !d) return;
    if (d.moved) {
      const r = el.getBoundingClientRect();
      store.patchUi({ x: Math.round(r.left), y: Math.round(r.top) });
    } else if (ui.minimized) {
      store.patchUi({ minimized: false });
    }
  };

  const copy = () =>
    st.answer &&
    navigator.clipboard?.writeText(st.answer).then(
      () => toast('Copied'),
      () => toast('Copy failed', 'error'),
    );

  const pos =
    ui.x !== undefined && ui.y !== undefined
      ? {
          left: `${clamp(ui.x, 4, innerWidth - 60)}px`,
          top: `${clamp(ui.y, 4, innerHeight - 44)}px`,
          right: 'auto',
          bottom: 'auto',
        }
      : undefined;

  const grip = (
    <button
      type="button"
      class="grip"
      aria-label={ui.minimized ? `Captcha solver: ${st.text}. Click to expand` : 'Drag to move'}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <span class="dot" />
    </button>
  );

  if (ui.minimized) {
    return (
      <div ref={ref} class="widget min" data-phase={st.phase} style={pos}>
        {grip}
      </div>
    );
  }

  return (
    <div ref={ref} class="widget" data-phase={disabled ? 'idle' : st.phase} style={pos}>
      {grip}
      {disabled ? (
        <span class="status">Off on this site</span>
      ) : st.phase === 'solved' ? (
        <button type="button" class="status answer" title="Click to copy" onClick={copy}>
          {st.answer}
          <small>{st.ms} ms</small>
          {st.warning && (
            <span class="warn" title={st.warning}>
              ⚠
            </span>
          )}
        </button>
      ) : (
        <span class="status" role="status" aria-live="polite" title={st.text}>
          {st.text}
        </span>
      )}
      {disabled ? (
        <button
          type="button"
          class="btn sm"
          onClick={() => store.saveSite(match.pattern, { ...match.rule, enabled: true })}
        >
          Enable
        </button>
      ) : st.action === 'settings' ? (
        <button type="button" class="btn primary sm" onClick={() => (settingsTab.value = 'provider')}>
          Fix
        </button>
      ) : (
        <button
          type="button"
          class="btn primary sm"
          disabled={st.phase === 'solving'}
          onClick={() => void controller.solve('manual')}
        >
          {st.phase === 'error' || st.phase === 'paused' ? 'Retry' : 'Solve'}
        </button>
      )}
      <button type="button" class="icon" aria-label="Settings" onClick={() => (settingsTab.value = 'sites')}>
        <Icon name="sliders" />
      </button>
      <button type="button" class="icon" aria-label="Minimize" onClick={() => store.patchUi({ minimized: true })}>
        <Icon name="minus" />
      </button>
    </div>
  );
}
