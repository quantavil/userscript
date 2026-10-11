// biome-ignore-all lint/a11y/noNoninteractiveTabindex: The scrollable activity log must be keyboard-focusable.
import { signal } from '@preact/signals';
import type { TargetedPointerEvent } from 'preact';
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { setGhostMode } from './board.js';
import {
  BrainIcon,
  CheckIcon,
  Chevron,
  ClearIcon,
  CopyIcon,
  GhostIcon,
  HelpIcon,
  KnightIcon,
  LightningIcon,
  OpeningStyleIcon,
  PowerIcon,
} from './icons.js';
import type { SiteCapabilities } from './sites/types.js';
import { BotState, Settings } from './state.js';
import type { CandidateLine, OpeningStyle, RecoveryAction, TimingMode } from './types/chess.js';

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
  autoRetry: boolean;
  openingBook: boolean;
  openingStyle: OpeningStyle;
  ponder: boolean;
  timingMode: TimingMode;
  depth: number;
  moveTimeMs: number;
  targetElo: number;
  blunderShield: boolean;
  ghostMode: boolean;
}

export interface PanelAnalysis {
  status: string;
  evaluation: string;
  bestMove: string;
  principalVariation: string;
  recoveryAction: RecoveryAction | null;
  multiPvLines?: CandidateLine[];
  evalHistory?: number[];
}

interface PanelLog {
  id: number;
  text: string;
  type: PanelLogType;
  time: string;
}

type Tone = 'error' | 'paused' | 'working' | 'ready' | 'idle';

const EDGE_MARGIN = 8;
const DOCK_QUERY = '(max-width: 560px)';
const COLLAPSED_KEY = 'scb_panel_collapsed';
const MAX_LOG_ENTRIES = 100;
const LOG_STICK_PX = 16;
const COPY_FEEDBACK_MS = 1400;

const readSettings = (): PanelSettings => ({
  enabled: !!BotState.hackEnabled,
  autoMove: !!BotState.autoMove,
  openingBook: !!BotState.openingBook,
  openingStyle: BotState.openingStyle,
  ponder: !!BotState.ponderEnabled,
  timingMode: BotState.timingMode,
  depth: BotState.botPower,
  moveTimeMs: BotState.moveTime,
  targetElo: BotState.targetElo,
  blunderShield: !!BotState.blunderShield,
  ghostMode: !!BotState.ghostMode,
  autoRetry: !!BotState.autoRetry,
});

const settingsSignal = signal<PanelSettings>(readSettings());
const analysisSignal = signal<PanelAnalysis>({
  status: BotState.statusInfo,
  evaluation: BotState.currentEvaluation,
  bestMove: BotState.bestMove,
  principalVariation: BotState.principalVariation,
  recoveryAction: BotState.recoveryAction,
  multiPvLines: BotState.multiPvLines,
  evalHistory: BotState.evalHistory,
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

/** Field-by-field equality over the keys of `b`; handles arrays and skips no-op signal writes. */
function shallowEqual<T extends object>(a: T, b: T): boolean {
  return (Object.keys(b) as (keyof T)[]).every((key) => {
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) return true;
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      return valA.every((v, i) => v === valB[i]);
    }
    return false;
  });
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
    case 'openingStyle':
      BotState.openingStyle = value as OpeningStyle;
      break;
    case 'ponder':
      BotState.ponderEnabled = value ? 1 : 0;
      break;
    case 'timingMode':
      BotState.timingMode = value as TimingMode;
      break;
    case 'depth':
      BotState.botPower = Number(value);
      break;
    case 'moveTimeMs':
      BotState.moveTime = Number(value);
      break;
    case 'targetElo':
      BotState.targetElo = Number(value);
      break;
    case 'blunderShield':
      BotState.blunderShield = value ? 1 : 0;
      break;
    case 'ghostMode':
      BotState.ghostMode = value ? 1 : 0;
      setGhostMode(!!value);
      break;
    case 'autoRetry':
      BotState.autoRetry = value ? 1 : 0;
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

export function toggleGhostMode(actions?: PanelActions): boolean {
  const next = !settingsSignal.value.ghostMode;
  updatePanelSetting('ghostMode', next, actions);
  return next;
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

function QuickEnableButton({ enabled, onToggle }: { enabled: boolean; onToggle: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      class="panel-quick-enable"
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable bot' : 'Enable bot'}
      title={enabled ? 'Disable bot' : 'Enable bot'}
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
      aria-label={enabled ? 'Disable bot' : 'Enable bot'}
      title={enabled ? 'Disable bot' : 'Enable bot'}
      onClick={() => onToggle(!enabled)}
    >
      <span class="panel-enable-label">Enable bot</span>
      <span class="panel-enable-action">
        <span class="panel-enable-state">{enabled ? 'On' : 'Off'}</span>
        <span class="panel-switch" aria-hidden="true">
          <span class="panel-switch-track" />
          <span class="panel-switch-knob" />
        </span>
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
  hint,
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
  hint?: string;
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
      {hint && <span class="panel-field-hint">{hint}</span>}
    </div>
  );
}

const OPENING_STYLES: {
  id: OpeningStyle;
  label: string;
  tooltip: string;
}[] = [
  {
    id: 'hyper-defensive',
    label: 'Hyper-Defensive',
    tooltip: 'Hyper-Defensive: Ironclad fortresses & solid pawn structures (Berlin, Petroff, Slav, Réti)',
  },
  {
    id: 'defensive',
    label: 'Defensive',
    tooltip: 'Defensive: Positional control & resilient structures (Caro-Kann, French, QGD)',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tooltip: 'Balanced: Classical grandmaster mainlines & standard book (Ruy Lopez, Italian)',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    tooltip: 'Aggressive: Sharp tactical lines & active piece attacks (King’s Gambit, Scotch, Evans)',
  },
  {
    id: 'hyper-aggressive',
    label: 'Hyper-Aggressive (Gambit)',
    tooltip: 'Hyper-Aggressive: High-risk gambits & tactical fireworks (Danish, Traxler, Stafford)',
  },
];

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

function EvalTrendGraph({ history }: { history?: number[] }) {
  if (!history || history.length < 2) return null;

  const width = 240;
  const height = 32;
  const zeroY = height / 2;
  const maxEval = 6;

  const coords = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const clamped = Math.max(-maxEval, Math.min(maxEval, val));
    const y = zeroY - (clamped / maxEval) * (height / 2 - 4);
    return { x, y };
  });

  const pathD = coords.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
    '',
  );
  const lastX = coords[coords.length - 1].x.toFixed(1);
  const firstX = coords[0].x.toFixed(1);
  const areaD = `${pathD} L ${lastX},${zeroY} L ${firstX},${zeroY} Z`;
  const latest = coords[coords.length - 1];
  const latestVal = history[history.length - 1];
  const latestFormatted = latestVal > 0 ? `+${latestVal.toFixed(1)}` : latestVal.toFixed(1);

  return (
    <div class="panel-trend">
      <div class="panel-trend-head">
        <span class="panel-trend-title">Eval Trend</span>
        <span class="panel-trend-val">{latestFormatted}</span>
      </div>
      <svg class="panel-trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="var(--line)" stroke-dasharray="3 3" stroke-width="1" />
        <path d={areaD} fill="rgba(217, 169, 79, 0.12)" />
        <path d={pathD} fill="none" stroke="var(--brass)" stroke-width="1.75" stroke-linejoin="round" />
        <circle cx={latest.x} cy={latest.y} r="2.5" fill="var(--brass)" />
      </svg>
    </div>
  );
}

function PanelGuide({ onClose }: { onClose: () => void }) {
  return (
    <section class="panel-guide" aria-label="Super Chess Bot Guide">
      <div class="panel-guide-head">
        <span class="panel-guide-title">
          <HelpIcon />
          <span>Quick Guide & Controls</span>
        </span>
        <button type="button" class="panel-guide-close" aria-label="Close guide" title="Close guide" onClick={onClose}>
          <ClearIcon />
        </button>
      </div>

      <div class="panel-guide-section">
        <span class="panel-guide-heading">Automation & Recovery</span>
        <div class="panel-guide-item">
          <strong>Auto Move & Auto Retry</strong>
          <p>
            When Auto Move is on, moves are played automatically. Auto Retry handles site input drops and network blips
            with an immediate, smooth resync.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Background Ponder</strong>
          <p>Anticipates the opponent's reply and searches during their clock for instant, natural moves.</p>
        </div>
      </div>

      <div class="panel-guide-section">
        <span class="panel-guide-heading">Human Stealth & Pacing</span>
        <div class="panel-guide-item">
          <strong>Dynamic vs Fixed Timing</strong>
          <p>
            Dynamic timing uses Ex-Gaussian entropy distributions to scale thinking times with tactical complexity.
            Fixed timing respects strict clock budgets.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Target Elo & Blunder Shield</strong>
          <p>
            Boltzmann throttling naturally blends moves to a target rating (0 = full engine strength 3200+). The Blunder
            Shield prevents catastrophic tactical blunders.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Stream-Safe Ghost Mode</strong>
          <p>
            Hides all board arrows, evaluation bars, and floating controls for clean streaming and recording. Toggle
            with the ghost icon or userscript menu.
          </p>
        </div>
      </div>

      <div class="panel-guide-section">
        <span class="panel-guide-heading">Opening & Endgame Power</span>
        <div class="panel-guide-item">
          <strong>Opening Repertoire</strong>
          <p>Choose from 5 styles: Hyper-Defensive, Defensive, Balanced, Aggressive, or Hyper-Aggressive (Gambits).</p>
        </div>
        <div class="panel-guide-item">
          <strong>Multi-PV & Syzygy 7-Piece</strong>
          <p>
            Displays the top 3 alternative candidate lines and queries Lichess Syzygy tablebases in 7-piece endgames for
            instant optimal play.
          </p>
        </div>
      </div>
    </section>
  );
}

function Panel({ host, actions }: { host: HTMLDivElement; actions: PanelActions; capabilities?: SiteCapabilities }) {
  // Signals are read during render; a parallel useState copy would only add a synchronization step.
  const settings = settingsSignal.value;
  const analysis = analysisSignal.value;
  const logs = logsSignal.value;
  const tone = statusTone(analysis, settings.enabled);
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed() ?? isDocked());
  const [helpOpen, setHelpOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(() => !isDocked());
  const [copied, setCopied] = useState(false);
  const logElement = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const copyTimer = useRef<number | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((value) => !value);
    setHelpOpen(false);
  };
  const updateSetting = <K extends keyof PanelSettings>(key: K, value: PanelSettings[K]) =>
    updatePanelSetting(key, value, actions);
  const previewSlider = (key: 'depth' | 'moveTimeMs' | 'targetElo', value: number) => {
    settingsSignal.value = { ...settingsSignal.value, [key]: value };
  };

  useEffect(() => storeCollapsed(collapsed), [collapsed]);

  useEffect(() => {
    if (host) {
      host.style.display = settings.ghostMode ? 'none' : '';
    }
  }, [host, settings.ghostMode]);

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
        <button
          type="button"
          class={`panel-icon panel-ghost-toggle ${settings.ghostMode ? 'is-active' : ''}`}
          aria-pressed={settings.ghostMode}
          aria-label={settings.ghostMode ? 'Disable ghost mode' : 'Enable ghost mode'}
          title={settings.ghostMode ? 'Ghost mode active' : 'Enable stream-safe ghost mode'}
          onClick={() => updateSetting('ghostMode', !settings.ghostMode)}
        >
          <GhostIcon />
        </button>
        <button
          type="button"
          class={`panel-icon panel-help-toggle ${helpOpen ? 'is-active' : ''}`}
          aria-expanded={helpOpen}
          aria-label="Bot guide"
          title="Bot guide"
          onClick={() => setHelpOpen((v) => !v)}
        >
          <HelpIcon />
        </button>
        {collapsed && (
          <QuickEnableButton enabled={settings.enabled} onToggle={(next) => updateSetting('enabled', next)} />
        )}
        <button
          type="button"
          class="panel-icon"
          aria-expanded={!collapsed}
          aria-controls="panel-body"
          aria-label={collapsed ? 'Show panel' : 'Hide panel'}
          title={collapsed ? 'Show panel' : 'Hide panel'}
          onClick={toggleCollapsed}
        >
          <Chevron />
        </button>
      </header>

      {helpOpen ? (
        <PanelGuide onClose={() => setHelpOpen(false)} />
      ) : (
        !collapsed && (
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
              {analysis.multiPvLines && analysis.multiPvLines.length > 1 && (
                <div class="panel-multipv-list">
                  {analysis.multiPvLines.slice(0, 3).map((pvLine) => {
                    const lineScore =
                      typeof pvLine.evaluation.mate === 'number'
                        ? `M${pvLine.evaluation.mate}`
                        : typeof pvLine.evaluation.cp === 'number'
                          ? pvLine.evaluation.cp > 0
                            ? `+${(pvLine.evaluation.cp / 100).toFixed(2)}`
                            : (pvLine.evaluation.cp / 100).toFixed(2)
                          : '—';
                    return (
                      <div key={pvLine.multipv} class="panel-multipv-row" data-rank={pvLine.multipv}>
                        <span class="panel-multipv-badge">#{pvLine.multipv}</span>
                        <span class="panel-multipv-move">{pvLine.san || pvLine.uci}</span>
                        <span class="panel-multipv-eval">{lineScore}</span>
                        <span class="panel-multipv-pv" title={pvLine.pv}>
                          {pvLine.pv}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <EvalTrendGraph history={analysis.evalHistory} />
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
                  label="Auto retry"
                  checked={settings.autoRetry}
                  onChange={(next) => updateSetting('autoRetry', next)}
                />
                <Toggle
                  label="Opening book"
                  checked={settings.openingBook}
                  onChange={(next) => updateSetting('openingBook', next)}
                />
                {settings.openingBook && (
                  <div class="panel-opening-style-section">
                    <div class="panel-segmented panel-opening-style-picker">
                      {OPENING_STYLES.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          class="panel-segment"
                          aria-pressed={settings.openingStyle === st.id}
                          aria-label={st.label}
                          title={st.tooltip}
                          onClick={() => updateSetting('openingStyle', st.id)}
                        >
                          <OpeningStyleIcon style={st.id} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Toggle
                  label="Background ponder"
                  checked={settings.ponder}
                  onChange={(next) => updateSetting('ponder', next)}
                />
              </div>

              <div class="panel-timing-row">
                <span class="panel-timing-label">Timing mode</span>
                <div class="panel-segmented panel-timing-segmented">
                  <button
                    type="button"
                    class="panel-segment panel-timing-segment"
                    aria-pressed={settings.timingMode === 'dynamic'}
                    aria-label="Dynamic timing"
                    title="Dynamic: adaptive thinking time, natural pacing on forced moves & opening book"
                    onClick={() => updateSetting('timingMode', 'dynamic')}
                  >
                    <BrainIcon />
                    <span>Dynamic</span>
                  </button>
                  <button
                    type="button"
                    class="panel-segment panel-timing-segment"
                    aria-pressed={settings.timingMode === 'fixed'}
                    aria-label="Fixed timing"
                    title="Fixed: rigid full-budget thinking time per move"
                    onClick={() => updateSetting('timingMode', 'fixed')}
                  >
                    <LightningIcon />
                    <span>Fixed</span>
                  </button>
                </div>
              </div>

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
                label={settings.timingMode === 'dynamic' ? 'Move budget' : 'Move time'}
                value={settings.moveTimeMs}
                min={25}
                max={5000}
                step={25}
                format={formatBudget}
                onPreview={(value) => previewSlider('moveTimeMs', value)}
                onCommit={(value) => updateSetting('moveTimeMs', value)}
              />
              <Slider
                id="bot-elo"
                label="Target Elo"
                value={settings.targetElo}
                min={0}
                max={3200}
                step={50}
                format={(v) => (v === 0 ? 'Max (3200+)' : `${v} Elo`)}
                onPreview={(value) => previewSlider('targetElo', value)}
                onCommit={(value) => updateSetting('targetElo', value)}
              />
              {settings.targetElo > 0 && (
                <Toggle
                  label="Blunder shield"
                  checked={settings.blunderShield}
                  onChange={(next) => updateSetting('blunderShield', next)}
                />
              )}
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
        )
      )}
    </aside>
  );
}
