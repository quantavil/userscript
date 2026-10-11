// biome-ignore-all lint/a11y/noNoninteractiveTabindex: The scrollable activity log must be keyboard-focusable.
import { signal } from '@preact/signals';
import type { TargetedPointerEvent } from 'preact';
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { SiteCapabilities } from './sites/types.js';
import { BotState, Settings } from './state.js';
import type { RecoveryAction } from './types/chess.js';

export type PanelLogType = 'info' | 'status' | 'error' | 'warn' | 'move' | 'opponent';

export interface PanelActions {
  setEnabled?: (enabled: boolean) => void;
  refreshSettings?: () => void;
  clearConsole?: () => void;
  recover?: () => void;
}

export interface PanelCapabilityView {
  transportNote: string | null;
}

export function getPanelCapabilityView(capabilities?: SiteCapabilities): PanelCapabilityView {
  const selectionInput = capabilities?.input === 'selection';
  return {
    transportNote: selectionInput
      ? 'Moves use legal square selection on this site.'
      : capabilities?.input === 'controller'
        ? 'Moves use the active game controller.'
        : null,
  };
}

interface PanelSettings {
  enabled: boolean;
  autoMove: boolean;
  openingBook: boolean;
  ponder: boolean;
  depth: number;
  moveTimeMs: number;
}

export interface PanelAnalysis {
  status: string;
  evaluation: string;
  bestMove: string;
  principalVariation: string;
  recoveryAction: RecoveryAction | null;
}

interface PanelLog {
  id: number;
  text: string;
  type: PanelLogType;
  time: string;
}

type Tone = 'error' | 'paused' | 'working' | 'ready' | 'idle';

interface PanelKeyEvent {
  key?: string;
  code: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  composedPath?: () => unknown[];
  target?: unknown;
  preventDefault?: () => void;
}

const EDGE_MARGIN = 8;
const DOCK_QUERY = '(max-width: 560px)';
const COLLAPSED_KEY = 'gabibot_panel_collapsed';
const MAX_LOG_ENTRIES = 100;
const LOG_STICK_PX = 16;
const COPY_FEEDBACK_MS = 1400;
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const readSettings = (): PanelSettings => ({
  enabled: !!BotState.hackEnabled,
  autoMove: !!BotState.autoMove,
  openingBook: !!BotState.openingBook,
  ponder: !!BotState.ponderEnabled,
  depth: BotState.botPower,
  moveTimeMs: BotState.moveTime,
});

const settingsSignal = signal<PanelSettings>(readSettings());
const analysisSignal = signal<PanelAnalysis>({
  status: BotState.statusInfo,
  evaluation: BotState.currentEvaluation,
  bestMove: BotState.bestMove,
  principalVariation: BotState.principalVariation,
  recoveryAction: BotState.recoveryAction,
});
const logsSignal = signal<PanelLog[]>([]);
let nextLogId = 0;

const logTextClass: Record<PanelLogType, string> = {
  info: 'log-text-info',
  status: 'log-text-status',
  error: 'log-text-error',
  warn: 'log-text-warn',
  move: 'log-text-move',
  opponent: 'log-text-opponent',
};

/** Field-by-field equality over the keys of `b`; used to skip no-op signal writes. */
function shallowEqual<T extends object>(a: T, b: T): boolean {
  return (Object.keys(b) as (keyof T)[]).every((key) => a[key] === b[key]);
}

export function appendPanelLog(text: string, type: PanelLogType = 'info'): void {
  const entry: PanelLog = {
    id: ++nextLogId,
    text,
    type,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  };
  logsSignal.value = [...logsSignal.value, entry].slice(-MAX_LOG_ENTRIES);
}

export function clearPanelLogs(): void {
  logsSignal.value = [];
}

export function syncPanelSettings(): void {
  const next = readSettings();
  if (shallowEqual(settingsSignal.value, next)) return;
  settingsSignal.value = next;
}

export function updatePanelAnalysis(next: PanelAnalysis): void {
  if (shallowEqual(analysisSignal.value, next)) return;
  analysisSignal.value = next;
}

function writeBotState<K extends keyof PanelSettings>(key: K, value: PanelSettings[K]): void {
  switch (key) {
    case 'enabled':
      BotState.hackEnabled = value ? 1 : 0;
      break;
    case 'autoMove':
      BotState.autoMove = value ? 1 : 0;
      break;
    case 'openingBook':
      BotState.openingBook = value ? 1 : 0;
      break;
    case 'ponder':
      BotState.ponderEnabled = value ? 1 : 0;
      break;
    case 'depth':
      BotState.botPower = Number(value);
      break;
    case 'moveTimeMs':
      BotState.moveTime = Number(value);
      break;
  }
}

export function updatePanelSetting<K extends keyof PanelSettings>(
  key: K,
  value: PanelSettings[K],
  actions?: PanelActions,
): void {
  settingsSignal.value = { ...settingsSignal.value, [key]: value };
  writeBotState(key, value);
  Settings.save();
  if (key === 'enabled') actions?.setEnabled?.(!!value);
  else actions?.refreshSettings?.();
}

/** True for any focusable text target, so typing never triggers a panel shortcut. */
function isEditableTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const element = target as { tagName?: string; isContentEditable?: boolean };
  return element.isContentEditable === true || EDITABLE_TAGS.has((element.tagName ?? '').toUpperCase());
}

export function handlePanelKeyDown(
  event: PanelKeyEvent,
  actions: PanelActions = {},
  toggleCollapsed?: () => void,
): void {
  const target = event.composedPath ? event.composedPath()[0] : event.target;
  if (isEditableTarget(target)) return;

  if (event.key?.toLowerCase() === 'b' && event.ctrlKey && !event.metaKey) {
    event.preventDefault?.();
    toggleCollapsed?.();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyE') {
    event.preventDefault?.();
    updatePanelSetting('enabled', !settingsSignal.value.enabled, actions);
  } else if (event.code === 'KeyR' && analysisSignal.value.recoveryAction !== null) {
    event.preventDefault?.();
    actions.recover?.();
  }
}

/* Position helpers. The panel floats on desktop and docks to the bottom edge on narrow screens (see CSS). */

function clampPosition(left: number, top: number, width: number, height: number): { left: number; top: number } {
  const maxLeft = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxTop = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    left: Math.min(Math.max(EDGE_MARGIN, left), maxLeft),
    top: Math.min(Math.max(EDGE_MARGIN, top), maxTop),
  };
}

/** Writes only values that changed, so resize observers do not churn the style attribute. */
function placeHost(host: HTMLElement, left: number, top: number): void {
  const nextLeft = `${left}px`;
  const nextTop = `${top}px`;
  if (host.style.left !== nextLeft) host.style.left = nextLeft;
  if (host.style.top !== nextTop) host.style.top = nextTop;
  if (host.style.right !== 'auto') host.style.right = 'auto';
}

function isDocked(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DOCK_QUERY).matches;
}

/* Collapsed state is a presentation preference, so it lives in its own key rather than the bot settings blob. */

function readStoredCollapsed(): boolean | null {
  try {
    const value = localStorage.getItem(COLLAPSED_KEY);
    return value === null ? null : value === '1';
  } catch {
    // Storage can be blocked by the host page; fall back to the viewport default.
    return null;
  }
}

function storeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Blocked storage only means the preference will not persist.
  }
}

export function mountPanel(
  root: HTMLElement,
  host: HTMLDivElement,
  actions: PanelActions,
  capabilities?: SiteCapabilities,
): void {
  render(<Panel host={host} actions={actions} capabilities={capabilities} />, root);
}

function formatBudget(milliseconds: number): string {
  return milliseconds < 1000 ? `${milliseconds} ms` : `${Number((milliseconds / 1000).toFixed(2))} s`;
}

function displayValue(value: string | null | undefined): string {
  return value && value !== '-' ? value : '—';
}

function hasLine(value: string): boolean {
  return !!value && value !== '-' && value !== 'Not available';
}

function statusTone(analysis: PanelAnalysis, enabled: boolean): Tone {
  if (analysis.recoveryAction === 'retry') return 'error';
  if (analysis.recoveryAction === 'resume') return 'paused';
  if (/error|failed|unavailable|not confirmed/i.test(analysis.status)) return 'error';
  if (/loading|analyz|ponder|submitting|resuming/i.test(analysis.status)) return 'working';
  return enabled ? 'ready' : 'idle';
}

function KnightIcon() {
  return (
    <svg
      class="panel-mark-icon"
      viewBox="0 0 45 45"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12 0 0 1.89-1.9 2-3.5-.73-.99-.5-2-.5-3 1-1 3 2.5 3 2.5l2 0s.78-1.99 2.5-3c1 0 1 3 1 3z"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <circle cx="15" cy="14" r="1.5" fill="var(--ink)" stroke="none" />
      <path d="M14 39v2h24v-2" stroke="currentColor" stroke-width="1.5" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M8 2v4.5" />
      <path d="M4.2 4.5a5.5 5.5 0 1 0 7.6 0" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-6" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5h11" />
      <path d="M6 2.5h4" />
      <path d="M4.5 4.5l.8 8.4a1.2 1.2 0 0 0 1.2 1.1h3a1.2 1.2 0 0 0 1.2-1.1l.8-8.4" />
      <path d="M7 7.5v3.5M9 7.5v3.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg class="panel-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

function QuickEnableButton({ enabled, onToggle }: { enabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      class="panel-quick-enable"
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable bot (E)' : 'Enable bot (E)'}
      title={enabled ? 'Disable bot (E)' : 'Enable bot (E)'}
      onClick={() => onToggle(!enabled)}
    >
      <PowerIcon />
      <span class="panel-quick-state">{enabled ? 'On' : 'Off'}</span>
      <span class="panel-switch" aria-hidden="true">
        <span class="panel-switch-track" />
        <span class="panel-switch-knob" />
      </span>
    </button>
  );
}

function EnableButton({ enabled, onToggle }: { enabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      class="panel-enable panel-enable-wide"
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable bot (E)' : 'Enable bot (E)'}
      title={enabled ? 'Disable bot (E)' : 'Enable bot (E)'}
      onClick={() => onToggle(!enabled)}
    >
      <span class="panel-enable-label">Enable bot</span>
      <span class="panel-enable-state">{enabled ? 'On' : 'Off'}</span>
      <span class="panel-switch" aria-hidden="true">
        <span class="panel-switch-track" />
        <span class="panel-switch-knob" />
      </span>
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label class="panel-toggle">
      <span>{label}</span>
      <span class="panel-switch">
        <input
          class="panel-switch-input"
          type="checkbox"
          checked={checked}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span class="panel-switch-track" aria-hidden="true" />
        <span class="panel-switch-knob" aria-hidden="true" />
      </span>
    </label>
  );
}

/** Dragging updates the display live; the commit (and the search restart it causes) happens on release. */
function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onPreview,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  return (
    <div class="panel-field">
      <div class="panel-field-head">
        <label htmlFor={id}>{label}</label>
        <output>{format(value)}</output>
      </div>
      <input
        id={id}
        class="panel-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onInput={(event) => onPreview(Number(event.currentTarget.value))}
        onChange={(event) => onCommit(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function RecoveryNotice({ kind, onRecover }: { kind: RecoveryAction; onRecover: () => void }) {
  const resume = kind === 'resume';
  return (
    <div class="panel-notice" role="alert" data-kind={kind}>
      <p>
        {resume
          ? 'Board input paused the bot. Resume when you are ready.'
          : 'The last action did not finish. Retry this position.'}
      </p>
      <button type="button" class="panel-button" onClick={onRecover}>
        {resume ? 'Resume bot' : 'Retry position'}
      </button>
    </div>
  );
}

function Panel({
  host,
  actions,
  capabilities,
}: {
  host: HTMLDivElement;
  actions: PanelActions;
  capabilities?: SiteCapabilities;
}) {
  // Signals are read during render; a parallel useState copy would only add a synchronization step.
  const settings = settingsSignal.value;
  const analysis = analysisSignal.value;
  const logs = logsSignal.value;
  const capabilityView = getPanelCapabilityView(capabilities);
  const tone = statusTone(analysis, settings.enabled);
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed() ?? isDocked());
  const [activityOpen, setActivityOpen] = useState(() => !isDocked());
  const [copied, setCopied] = useState(false);
  const logElement = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const copyTimer = useRef<number | null>(null);

  const toggleCollapsed = () => setCollapsed((value) => !value);
  const updateSetting = <K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) =>
    updatePanelSetting(key, value, actions);
  const previewSlider = (key: 'depth' | 'moveTimeMs', value: number) => {
    settingsSignal.value = { ...settingsSignal.value, [key]: value };
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) =>
      handlePanelKeyDown(event, actions, () => setCollapsed((value) => !value));
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  useEffect(() => storeCollapsed(collapsed), [collapsed]);

  useEffect(() => {
    const keepOnScreen = () => {
      if (isDocked()) return;
      const rect = host.getBoundingClientRect();
      const next = clampPosition(rect.left, rect.top, rect.width, rect.height);
      placeHost(host, next.left, next.top);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(keepOnScreen);
    observer?.observe(host);
    window.addEventListener('resize', keepOnScreen);
    const frame = requestAnimationFrame(keepOnScreen);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', keepOnScreen);
      cancelAnimationFrame(frame);
    };
  }, [host, collapsed]);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (logs.length === 0) stickToBottom.current = true;
    const log = logElement.current;
    if (activityOpen && log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [logs, activityOpen]);

  const beginDrag = (event: TargetedPointerEvent<HTMLElement>) => {
    if (isDocked() || event.button !== 0 || (event.target as Element).closest('button, input, label, a')) return;
    event.preventDefault();

    const start = host.getBoundingClientRect();
    const originX = event.clientX;
    const originY = event.clientY;
    const drag = new AbortController();
    const finish = () => {
      drag.abort();
      host.classList.remove('dragging');
      Settings.save();
    };

    host.classList.add('dragging');
    window.addEventListener(
      'pointermove',
      (pointer) => {
        const next = clampPosition(
          start.left + pointer.clientX - originX,
          start.top + pointer.clientY - originY,
          start.width,
          start.height,
        );
        placeHost(host, next.left, next.top);
      },
      { signal: drag.signal },
    );
    for (const type of ['pointerup', 'pointercancel', 'blur'] as const) {
      window.addEventListener(type, finish, { once: true, signal: drag.signal });
    }
  };

  const copyLogs = async () => {
    const text = logs.map((entry) => `[${entry.time}] ${entry.text}`).join('\n');
    if (!text || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = null;
        setCopied(false);
      }, COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };

  const move = displayValue(analysis.bestMove);
  const evaluation = displayValue(analysis.evaluation);
  const line = hasLine(analysis.principalVariation) ? analysis.principalVariation : 'Waiting for a position';

  return (
    <aside
      class="panel"
      data-state={collapsed ? 'collapsed' : 'open'}
      data-tone={tone}
      aria-label="Super Chess Bot controls"
    >
      <header class="panel-bar" onPointerDown={beginDrag}>
        <span class="panel-mark" aria-hidden="true">
          <KnightIcon />
        </span>
        <div class="panel-bar-text">
          <strong class="panel-title">Super Chess Bot</strong>
          {collapsed ? (
            <span class="panel-summary">
              <span class="panel-dot" aria-hidden="true" />
              {move !== '—' ? (
                <>
                  <b>{move}</b>
                  <span>{evaluation}</span>
                </>
              ) : (
                <span class="panel-status-text">{analysis.status || 'Ready'}</span>
              )}
            </span>
          ) : (
            <span class="panel-status" title={analysis.status}>
              <span class="panel-dot" aria-hidden="true" />
              <span class="panel-status-text">{analysis.status || 'Ready'}</span>
            </span>
          )}
        </div>
        {collapsed && (
          <QuickEnableButton enabled={settings.enabled} onToggle={(next) => updateSetting('enabled', next)} />
        )}
        <button
          type="button"
          class="panel-icon"
          aria-expanded={!collapsed}
          aria-controls="panel-body"
          aria-label={collapsed ? 'Show panel' : 'Hide panel'}
          title={collapsed ? 'Show panel (Ctrl+B)' : 'Hide panel (Ctrl+B)'}
          onClick={toggleCollapsed}
        >
          <Chevron />
        </button>
      </header>

      {!collapsed && (
        <div class="panel-body" id="panel-body">
          <section class="panel-hero" aria-label="Suggested move">
            <div class="panel-move-row">
              <output class="panel-move" aria-label="Suggested move">
                {move}
              </output>
              <output class="panel-score" aria-label="Evaluation">
                {evaluation}
              </output>
            </div>
            <p class="panel-line" title={analysis.principalVariation}>
              {line}
            </p>
            {analysis.recoveryAction && (
              <RecoveryNotice kind={analysis.recoveryAction} onRecover={() => actions.recover?.()} />
            )}
          </section>

          <section class="panel-settings" aria-label="Bot settings">
            <EnableButton enabled={settings.enabled} onToggle={(next) => updateSetting('enabled', next)} />
            <div class="panel-toggles">
              <Toggle
                label="Auto move"
                checked={settings.autoMove}
                onChange={(next) => updateSetting('autoMove', next)}
              />
              <Toggle
                label="Opening book"
                checked={settings.openingBook}
                onChange={(next) => updateSetting('openingBook', next)}
              />
              <Toggle
                label="Background ponder"
                checked={settings.ponder}
                onChange={(next) => updateSetting('ponder', next)}
              />
            </div>
            {capabilityView.transportNote && <p class="panel-note">{capabilityView.transportNote}</p>}

            <Slider
              id="bot-depth"
              label="Depth cap"
              value={settings.depth}
              min={1}
              max={30}
              step={1}
              format={String}
              onPreview={(value) => previewSlider('depth', value)}
              onCommit={(value) => updateSetting('depth', value)}
            />
            <Slider
              id="move-budget"
              label="Move time"
              value={settings.moveTimeMs}
              min={25}
              max={5000}
              step={25}
              format={formatBudget}
              onPreview={(value) => previewSlider('moveTimeMs', value)}
              onCommit={(value) => updateSetting('moveTimeMs', value)}
            />
          </section>

          <section class="panel-activity" aria-label="Activity log">
            <div class="panel-activity-head">
              <button
                type="button"
                class="panel-disclosure"
                aria-expanded={activityOpen}
                aria-controls="panel-log"
                onClick={() => setActivityOpen((value) => !value)}
              >
                Activity
                <span class="panel-count">{logs.length}</span>
              </button>
              {activityOpen && (
                <div class="panel-activity-actions">
                  <button
                    type="button"
                    class={`panel-icon-btn ${copied ? 'is-success' : ''}`}
                    aria-label={copied ? 'Log copied to clipboard' : 'Copy log'}
                    title={copied ? 'Copied!' : 'Copy log'}
                    onClick={copyLogs}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                  <button
                    type="button"
                    class="panel-icon-btn"
                    aria-label="Clear log"
                    title="Clear log"
                    onClick={() => actions.clearConsole?.()}
                  >
                    <ClearIcon />
                  </button>
                </div>
              )}
            </div>
            {activityOpen && (
              <div
                id="panel-log"
                ref={logElement}
                class="panel-log"
                role="log"
                aria-label="Engine activity"
                aria-live="off"
                tabIndex={0}
                onScroll={() => {
                  const log = logElement.current;
                  if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < LOG_STICK_PX;
                }}
              >
                {logs.length === 0 ? (
                  <p class="panel-log-empty">Moves and engine updates will appear here.</p>
                ) : (
                  logs.map((entry) => (
                    <p key={entry.id} class={`panel-log-entry ${logTextClass[entry.type]}`}>
                      <time>{entry.time}</time>
                      <span>{entry.text}</span>
                    </p>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
