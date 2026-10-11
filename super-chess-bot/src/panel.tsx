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
  showMoveMethod: boolean;
  transportNote: string | null;
}

export function getPanelCapabilityView(capabilities?: SiteCapabilities): PanelCapabilityView {
  const selectionInput = capabilities?.input === 'selection';
  return {
    showMoveMethod: capabilities?.input === 'gestures' || capabilities === undefined,
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
  moveMethod: 'click' | 'drag';
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

const readSettings = (): PanelSettings => ({
  enabled: !!BotState.hackEnabled,
  autoMove: !!BotState.autoMove,
  openingBook: !!BotState.openingBook,
  ponder: !!BotState.ponderEnabled,
  depth: BotState.botPower,
  moveTimeMs: BotState.moveTime,
  moveMethod: BotState.moveMethod,
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
const logTextColor: Record<PanelLogType, string> = {
  info: 'log-text-info',
  status: 'log-text-status',
  error: 'log-text-error',
  warn: 'log-text-warn',
  move: 'log-text-move',
  opponent: 'log-text-opponent',
};

export function appendPanelLog(text: string, type: PanelLogType = 'info'): void {
  const entry: PanelLog = {
    id: ++nextLogId,
    text,
    type,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  };
  logsSignal.value = [...logsSignal.value, entry].slice(-100);
}

export function clearPanelLogs(): void {
  logsSignal.value = [];
}

export function syncPanelSettings(): void {
  const current = settingsSignal.value;
  const next = readSettings();
  if (
    current.enabled === next.enabled &&
    current.autoMove === next.autoMove &&
    current.openingBook === next.openingBook &&
    current.ponder === next.ponder &&
    current.depth === next.depth &&
    current.moveTimeMs === next.moveTimeMs &&
    current.moveMethod === next.moveMethod
  ) {
    return;
  }
  settingsSignal.value = next;
}

export function updatePanelAnalysis(next: PanelAnalysis): void {
  const current = analysisSignal.value;
  if (
    current.status === next.status &&
    current.evaluation === next.evaluation &&
    current.bestMove === next.bestMove &&
    current.principalVariation === next.principalVariation &&
    current.recoveryAction === next.recoveryAction
  ) {
    return;
  }
  analysisSignal.value = next;
}

export function updatePanelSetting<K extends keyof PanelSettings>(
  key: K,
  value: PanelSettings[K],
  actions?: PanelActions,
): void {
  const next = { ...settingsSignal.value, [key]: value };
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
    case 'moveMethod':
      BotState.moveMethod = value as PanelSettings['moveMethod'];
      break;
  }
  settingsSignal.value = next;
  Settings.save();

  if (key === 'enabled') actions?.setEnabled?.(!!value);
  else actions?.refreshSettings?.();
}

export function handlePanelKeyDown(
  event: {
    key: string;
    code: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    composedPath?: () => unknown[];
    target?: unknown;
    preventDefault?: () => void;
  },
  actions: PanelActions = {},
  toggleMinimized?: () => void,
): void {
  const target = event.composedPath ? event.composedPath()[0] : event.target;
  const targetElement =
    target && typeof target === 'object' ? (target as { tagName?: string; isContentEditable?: boolean }) : null;
  if (
    (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' && target instanceof HTMLTextAreaElement) ||
    (typeof HTMLSelectElement !== 'undefined' && target instanceof HTMLSelectElement) ||
    (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement && target.isContentEditable) ||
    targetElement?.isContentEditable === true ||
    targetElement?.tagName === 'INPUT' ||
    targetElement?.tagName === 'TEXTAREA' ||
    targetElement?.tagName === 'SELECT'
  ) {
    return;
  }
  if (event.key.toLowerCase() === 'b' && event.ctrlKey && !event.metaKey) {
    event.preventDefault?.();
    toggleMinimized?.();
    return;
  }
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.code === 'KeyE') {
      event.preventDefault?.();
      updatePanelSetting('enabled', !settingsSignal.value.enabled, actions);
    } else if (event.code === 'KeyR' && analysisSignal.value.recoveryAction !== null) {
      event.preventDefault?.();
      actions.recover?.();
    }
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
  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(milliseconds % 1000 === 0 ? 0 : 1)} s`
    : `${milliseconds} ms`;
}

function statusTone(analysis: PanelAnalysis, enabled: boolean): string {
  if (analysis.recoveryAction === 'retry') return 'error';
  if (analysis.recoveryAction === 'resume') return 'paused';
  if (/error|failed|unavailable|not confirmed/i.test(analysis.status)) return 'error';
  if (/loading|analyz|ponder|submitting|resuming/i.test(analysis.status)) return 'working';
  return enabled ? 'ready' : 'idle';
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
        <span class="panel-switch-thumb" aria-hidden="true" />
      </span>
    </label>
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
  // Read signals directly in the component; a parallel useState copy only adds synchronization work.
  const settings = settingsSignal.value;
  const analysis = analysisSignal.value;
  const logs = logsSignal.value;
  const capabilityView = getPanelCapabilityView(capabilities);
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const logElement = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handlePanelKeyDown(event, actions, () => setMinimized((value) => !value));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  useEffect(() => {
    const clampToViewport = () => {
      const rect = host.getBoundingClientRect();
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin));
      const top = Math.max(margin, Math.min(rect.top, window.innerHeight - rect.height - margin));
      host.style.left = `${left}px`;
      host.style.right = 'auto';
      host.style.top = `${top}px`;
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(clampToViewport);
    observer?.observe(host);
    window.addEventListener('resize', clampToViewport);
    const frame = requestAnimationFrame(clampToViewport);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', clampToViewport);
      cancelAnimationFrame(frame);
    };
  }, [host, minimized]);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  useEffect(() => {
    const log = logElement.current;
    if (logs.length === 0) {
      stickToBottom.current = true;
      return;
    }
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [logs]);

  const updateSetting = <K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) => {
    updatePanelSetting(key, value, actions);
  };

  const beginDrag = (event: TargetedPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button, input, a')) return;
    event.preventDefault();

    const start = host.getBoundingClientRect();
    const originX = event.clientX;
    const originY = event.clientY;
    let finished = false;
    const maxLeft = () => Math.max(8, window.innerWidth - start.width - 8);
    const maxTop = () => Math.max(8, window.innerHeight - start.height - 8);

    const move = (pointerEvent: PointerEvent) => {
      const left = Math.min(Math.max(8, start.left + pointerEvent.clientX - originX), maxLeft());
      const top = Math.min(Math.max(8, start.top + pointerEvent.clientY - originY), maxTop());
      host.style.left = `${left}px`;
      host.style.right = 'auto';
      host.style.top = `${top}px`;
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      host.classList.remove('dragging');
      Settings.save();
    };

    host.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    window.addEventListener('blur', finish, { once: true });
  };

  const copyLogs = async () => {
    const text = logsSignal.value.map((log) => `[${log.time}] ${log.text}`).join('\n');
    if (!text || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = null;
        setCopied(false);
      }, 1400);
    } catch {
      setCopied(false);
    }
  };

  const tone = statusTone(analysis, settings.enabled);
  const canRecover = analysis.recoveryAction !== null;

  return (
    <aside class="panel-shell" aria-label="Super Chess Bot controls">
      <header class="panel-header" onPointerDown={beginDrag}>
        <span class="panel-brandmark" aria-hidden="true">
          ♞
        </span>
        <div class="panel-brand">
          <strong class="panel-title">Super Chess Bot</strong>
          <span class="panel-state" data-tone={tone} role="status" aria-live="polite" title={analysis.status}>
            <i class="panel-state-dot" aria-hidden="true" />
            <span class="panel-state-text">{analysis.status || 'Ready'}</span>
          </span>
        </div>
        <button
          class="panel-icon-button"
          type="button"
          aria-label={minimized ? 'Expand panel' : 'Minimize panel'}
          aria-expanded={!minimized}
          title="Minimize or expand (Ctrl+B)"
          onClick={() => setMinimized((value) => !value)}
        >
          <span aria-hidden="true">{minimized ? '+' : '−'}</span>
        </button>
      </header>

      {!minimized && (
        <div class="panel-scroll">
          <section class="panel-analysis" aria-label="Suggested move">
            <div class="panel-analysis-heading">
              <span class="panel-eyebrow">Suggested move</span>
              <output class="panel-evaluation" aria-label={`Evaluation ${analysis.evaluation || 'unknown'}`}>
                {analysis.evaluation && analysis.evaluation !== '-' ? analysis.evaluation : '—'}
              </output>
            </div>
            <div class="panel-best-move">
              {analysis.bestMove && analysis.bestMove !== '-' ? analysis.bestMove : '—'}
            </div>
            <div class="panel-line" title={analysis.principalVariation}>
              {analysis.principalVariation &&
              analysis.principalVariation !== '-' &&
              analysis.principalVariation !== 'Not available'
                ? `Line · ${analysis.principalVariation}`
                : 'Waiting for a position'}
            </div>
            {canRecover && (
              <div class="panel-recovery" data-kind={analysis.recoveryAction}>
                <span>
                  {analysis.recoveryAction === 'resume'
                    ? 'Board input paused the bot. Resume when you are ready.'
                    : 'The last action did not finish. Retry this position.'}
                </span>
                <button class="panel-action-button" type="button" onClick={() => actions.recover?.()}>
                  {analysis.recoveryAction === 'resume' ? 'Resume bot' : 'Retry'}
                </button>
              </div>
            )}
          </section>

          <section class="panel-controls" aria-label="Bot settings">
            <div class="panel-section-heading">Automation</div>
            <div class="panel-toggle-list">
              <Toggle
                label="Enable bot"
                checked={settings.enabled}
                onChange={(checked) => updateSetting('enabled', checked)}
              />
              <Toggle
                label="Auto move"
                checked={settings.autoMove}
                onChange={(checked) => updateSetting('autoMove', checked)}
              />
              <Toggle
                label="Opening book"
                checked={settings.openingBook}
                onChange={(checked) => updateSetting('openingBook', checked)}
              />
              <Toggle
                label="Background ponder"
                checked={settings.ponder}
                onChange={(checked) => updateSetting('ponder', checked)}
              />
            </div>
            {capabilityView.transportNote && <p class="panel-site-note">{capabilityView.transportNote}</p>}

            <div class="panel-slider">
              <div class="panel-setting-heading">
                <label htmlFor="bot-depth">Depth cap</label>
                <output>{settings.depth}</output>
              </div>
              <input
                id="bot-depth"
                class="panel-range"
                type="range"
                min="1"
                max="30"
                step="1"
                value={settings.depth}
                aria-label="Maximum search depth"
                onInput={(event) => updateSetting('depth', Number(event.currentTarget.value))}
              />
            </div>
            <div class="panel-slider">
              <div class="panel-setting-heading">
                <label htmlFor="move-budget">Move time</label>
                <output>{formatBudget(settings.moveTimeMs)}</output>
              </div>
              <input
                id="move-budget"
                class="panel-range"
                type="range"
                min="25"
                max="5000"
                step="25"
                value={settings.moveTimeMs}
                aria-label="Move time budget in milliseconds"
                onInput={(event) => updateSetting('moveTimeMs', Number(event.currentTarget.value))}
              />
            </div>

            {capabilityView.showMoveMethod && (
              <fieldset class="panel-method">
                <legend>Move input method</legend>
                <div class="panel-segmented">
                  <button
                    class="panel-segment"
                    type="button"
                    aria-pressed={settings.moveMethod === 'click'}
                    onClick={() => updateSetting('moveMethod', 'click')}
                  >
                    Click
                  </button>
                  <button
                    class="panel-segment"
                    type="button"
                    aria-pressed={settings.moveMethod === 'drag'}
                    onClick={() => updateSetting('moveMethod', 'drag')}
                  >
                    Drag
                  </button>
                </div>
              </fieldset>
            )}
          </section>

          <section class="panel-activity" aria-label="Activity log">
            <div class="panel-activity-heading">
              <span>Activity</span>
              <div class="panel-activity-actions">
                <button
                  class="panel-quiet-button"
                  type="button"
                  aria-label={copied ? 'Log copied' : 'Copy log'}
                  onClick={copyLogs}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  class="panel-quiet-button"
                  type="button"
                  aria-label="Clear log"
                  onClick={() => actions.clearConsole?.()}
                >
                  Clear
                </button>
              </div>
            </div>
            <div
              ref={logElement}
              class="panel-log"
              role="log"
              aria-label="Engine activity"
              aria-live="off"
              tabIndex={0}
              onScroll={() => {
                const log = logElement.current;
                if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 16;
              }}
            >
              {logs.length === 0 ? (
                <p class="panel-log-empty">Moves and engine updates will appear here.</p>
              ) : (
                logs.map((entry) => (
                  <p key={entry.id} class={`panel-log-entry ${logTextColor[entry.type]}`}>
                    <time>{entry.time}</time>
                    <span>{entry.text}</span>
                  </p>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
