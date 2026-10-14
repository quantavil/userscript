// biome-ignore-all lint/a11y/noNoninteractiveTabindex: The scrollable activity log must be keyboard-focusable.
import { signal } from '@preact/signals';
import type { TargetedPointerEvent } from 'preact';
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BotState } from '../app/state.js';
import { setGhostMode } from '../board/overlays.js';
import type { CandidateLine, OpeningStyle, RecoveryAction, SettingsData, TimingMode } from '../chess/types.js';
import { LIVE_MULTI_PV } from '../engine/uci-client.js';
import { gameHistoryTracker, gameMovesSignal } from '../game/history.js';
import {
  MAX_BOT_POWER,
  MAX_MOVE_TIME,
  MAX_TARGET_ELO,
  MIN_BOT_POWER,
  MIN_MOVE_TIME,
  OPENING_STYLES,
  TIMING_MODES,
} from '../settings/schema.js';
import { Settings } from '../settings/storage.js';
import { scoreToDisplay } from '../shared/utils.js';
import { EvalTrendGraph } from './components/eval-trend-graph.js';
import { GameReportPanel } from './components/game-report-panel.js';
import { MoveScoresheet } from './components/move-scoresheet.js';
import {
  BrainIcon,
  CheckIcon,
  Chevron,
  ClearIcon,
  CopyIcon,
  HelpIcon,
  KnightIcon,
  LightningIcon,
  OpeningStyleIcon,
  PowerIcon,
} from './icons.js';
import { getStatusTone, setupProblem } from './status.js';

export type PanelLogType = 'info' | 'status' | 'error' | 'warn' | 'move';

export interface PanelActions {
  setEnabled?: (enabled: boolean) => void;
  refreshSettings?: () => void;
  clearConsole?: () => void;
  recover?: () => void;
  generateReport?: () => void;
  cancelReport?: () => void;
}

/** Preferences without panel chrome, under the same key names the live state uses. */
type PanelSettings = Omit<SettingsData, 'menuPosition'>;

export interface PanelAnalysis {
  status: string;
  evaluation: string;
  bestMove: string;
  principalVariation: string;
  recoveryAction: RecoveryAction | null;
  multiPvLines?: CandidateLine[];
  evalHistory?: number[];
  reportAvailable?: boolean;
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

const readSettings = (): PanelSettings => ({ ...(BotState as unknown as PanelSettings) });

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
};

/** Shallow equality to skip no-op signal writes. Arrays compare by element identity, so callers
 * must pass referentially stable arrays. */
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
  const target = BotState as unknown as Record<keyof PanelSettings, PanelSettings[keyof PanelSettings]>;
  target[key] = value;
  // Ghost mode also drives the board overlay, which has no settings accessor of its own.
  if (key === 'ghostMode') setGhostMode(value as boolean);
}

// Report-only preferences are excluded on purpose: restarting the live search because someone
// moved the report depth stepper is pointless and visible to the opponent.
const SEARCH_ALTERING_SETTINGS = new Set<keyof PanelSettings>([
  'botPower',
  'moveTime',
  'timingMode',
  'targetElo',
  'blunderShield',
  'madmanMode',
  'openingBook',
  'openingStyle',
  'ponderEnabled',
]);

export function updatePanelSetting<K extends keyof PanelSettings>(
  key: K,
  value: PanelSettings[K],
  actions?: PanelActions,
): void {
  settingsSignal.value = { ...settingsSignal.value, [key]: value };
  writeBotState(key, value);
  Settings.save();
  if (key === 'hackEnabled') actions?.setEnabled?.(value as boolean);
  else if (SEARCH_ALTERING_SETTINGS.has(key)) actions?.refreshSettings?.();
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

export function mountPanel(root: HTMLElement, host: HTMLDivElement, actions: PanelActions): void {
  render(<Panel host={host} actions={actions} />, root);
}

function formatBudget(milliseconds: number): string {
  return milliseconds < 1000 ? `${milliseconds} ms` : `${Number((milliseconds / 1000).toFixed(2))} s`;
}

function displayValue(value: string | null | undefined): string {
  return value && value !== '-' ? value : '—';
}

function hasLine(value: string): boolean {
  return !!value && value !== '-';
}

function statusTone(analysis: PanelAnalysis, enabled: boolean): Tone {
  if (analysis.recoveryAction === 'retry') return 'error';
  if (analysis.recoveryAction === 'resume') return 'paused';
  return getStatusTone(analysis.status, enabled);
}

function SwitchKnob() {
  return (
    <>
      <span class="panel-switch-track" aria-hidden="true" />
      <span class="panel-switch-knob" aria-hidden="true" />
    </>
  );
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
        <SwitchKnob />
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
        <SwitchKnob />
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

const TIMING_MODE_PRESENTATION: Record<TimingMode, { label: string; tooltip: string }> = {
  dynamic: {
    label: 'Dynamic',
    tooltip: 'Dynamic: adaptive thinking time, natural pacing on forced moves & opening book',
  },
  fixed: {
    label: 'Fixed',
    tooltip: 'Fixed: rigid full-budget thinking time per move',
  },
};

/** Presentation for the styles the schema accepts, keyed by the single canonical style id list. */
const OPENING_STYLE_PRESENTATION: Record<OpeningStyle, { label: string; tooltip: string }> = {
  'hyper-defensive': {
    label: 'Hyper-Defensive',
    tooltip: 'Hyper-Defensive: Ironclad fortresses & solid pawn structures (Berlin, Petroff, Slav, Réti)',
  },
  defensive: {
    label: 'Defensive',
    tooltip: 'Defensive: Positional control & resilient structures (Caro-Kann, French, QGD)',
  },
  balanced: {
    label: 'Balanced',
    tooltip: 'Balanced: Classical grandmaster mainlines & standard book (Ruy Lopez, Italian)',
  },
  aggressive: {
    label: 'Aggressive',
    tooltip: 'Aggressive: Sharp tactical lines & active piece attacks (King’s Gambit, Scotch, Evans)',
  },
  'hyper-aggressive': {
    label: 'Hyper-Aggressive (Gambit)',
    tooltip: 'Hyper-Aggressive: High-risk gambits & tactical fireworks (Danish, Traxler, Stafford)',
  },
};

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

function SetupNotice({ status }: { status?: string }) {
  if (!status || !setupProblem(status)) return null;
  return (
    <div class="panel-notice" role="alert" data-kind="error">
      <p>{status}</p>
    </div>
  );
}

function PanelGuide({ onClose }: { onClose?: () => void }) {
  return (
    <section class="panel-guide" id="panel-guide" aria-label="Super Chess Bot Guide">
      <div class="panel-guide-head">
        <span class="panel-guide-title">
          <HelpIcon />
          <span>Quick Guide & Controls</span>
        </span>
        {onClose && (
          <button type="button" class="panel-button" onClick={onClose}>
            Back to controls
          </button>
        )}
      </div>

      <div class="panel-guide-section">
        <span class="panel-guide-heading">Automation & Recovery</span>
        <div class="panel-guide-item">
          <strong>Auto Move & Auto Retry</strong>
          <p>
            Auto Move plays moves automatically. Auto Retry makes up to two retries for failed searches or input
            failures before dispatch. Uncertain move outcomes require manual recovery.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Background Ponder</strong>
          <p>Searches predicted replies during the opponent's turn and reuses analysis when the position matches.</p>
        </div>
      </div>

      <div class="panel-guide-section">
        <span class="panel-guide-heading">Move Pacing</span>
        <div class="panel-guide-item">
          <strong>Dynamic vs Fixed Timing</strong>
          <p>
            Dynamic timing varies move delays with position complexity. Fixed timing uses the configured search budget;
            engine startup and site response can add latency.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Target Elo & Blunder Shield</strong>
          <p>
            Target Elo adjusts candidate selection; ratings are not calibrated. Set 0 for the strongest selected line.
            Blunder Shield filters candidates with large evaluation drops.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Stream-Safe Ghost Mode</strong>
          <p>
            Hides all board arrows and panel controls for clean streaming and recording. Toggle via the userscript menu
            command (GM menu: ♟ Toggle Ghost Mode).
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
            Displays up to 3 candidate lines. Standard positions with up to 7 pieces query Lichess Syzygy tablebases
            alongside local search, using the first available valid result.
          </p>
        </div>
        <div class="panel-guide-item">
          <strong>Activity & Standard PGN Export</strong>
          <p>
            Displays full game moves with per-move timing estimates for both players. Click the copy icon in Activity to
            export standard pasteable PGN with [%emt] move times and telemetry disclosure.
          </p>
        </div>
      </div>
    </section>
  );
}

function Panel({ host, actions }: { host: HTMLDivElement; actions: PanelActions }) {
  // Signals are read during render; a parallel useState copy would only add a synchronization step.
  const settings = settingsSignal.value;
  const analysis = analysisSignal.value;
  const logs = logsSignal.value;
  const gameMoves = gameMovesSignal.value;
  const movePairs = gameHistoryTracker.getMovePairs();
  const tone = statusTone(analysis, settings.hackEnabled);
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed() ?? isDocked());
  const [helpOpen, setHelpOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
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
  const previewSlider = (key: 'botPower' | 'moveTime' | 'targetElo', value: number) => {
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
    if (logs.length === 0 && gameMoves.length === 0) stickToBottom.current = true;
    const log = logElement.current;
    if (activityOpen && log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [logs, gameMoves, activityOpen]);

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
    let text = '';
    if (gameMoves.length > 0) {
      const siteName =
        typeof window !== 'undefined' && window.location?.hostname?.includes('lichess') ? 'Lichess' : 'Chess.com';
      const result = gameHistoryTracker.getResult() ?? undefined;
      text = gameHistoryTracker.exportPgn(siteName, result);
    } else {
      text = logs.map((entry) => `[${entry.time}] ${entry.text}`).join('\n');
    }
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
            <span class="panel-status" title={analysis.status} aria-live="polite">
              <span class="panel-dot" aria-hidden="true" />
              <span class="panel-status-text">{analysis.status || 'Ready'}</span>
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            class={`panel-icon panel-help-toggle ${helpOpen ? 'is-active' : ''}`}
            aria-expanded={helpOpen}
            aria-controls="panel-guide"
            aria-label="Bot guide"
            title="Bot guide"
            onClick={() => setHelpOpen((v) => !v)}
          >
            <HelpIcon />
          </button>
        )}
        <QuickEnableButton enabled={settings.hackEnabled} onToggle={(next) => updateSetting('hackEnabled', next)} />
        <button
          type="button"
          class="panel-icon"
          aria-expanded={!collapsed}
          aria-controls={helpOpen ? 'panel-guide' : 'panel-body'}
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
              {(!analysis.multiPvLines || analysis.multiPvLines.length <= 1) && (
                <p class="panel-line" title={analysis.principalVariation}>
                  {line}
                </p>
              )}
              {analysis.multiPvLines && analysis.multiPvLines.length > 1 && (
                <div class="panel-multipv-list">
                  {analysis.multiPvLines.slice(0, LIVE_MULTI_PV).map((pvLine) => {
                    const lineScore = scoreToDisplay(pvLine.evaluation);
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
              <SetupNotice status={analysis.status} />
              {analysis.recoveryAction && (
                <RecoveryNotice kind={analysis.recoveryAction} onRecover={() => actions.recover?.()} />
              )}
            </section>

            <GameReportPanel
              reportDepth={settings.reportDepth}
              canGenerate={!!analysis.reportAvailable}
              onGenerate={() => actions.generateReport?.()}
              onCancel={() => actions.cancelReport?.()}
              onDepthChange={(next) => updateSetting('reportDepth', next)}
            />

            <section class="panel-settings" aria-label="Bot settings">
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
                  label="Premove"
                  checked={settings.premove}
                  onChange={(next) => updateSetting('premove', next)}
                />
                <Toggle
                  label="Background ponder"
                  checked={settings.ponderEnabled}
                  onChange={(next) => updateSetting('ponderEnabled', next)}
                />
                <Toggle
                  label="Blunder shield"
                  checked={settings.blunderShield}
                  onChange={(next) => updateSetting('blunderShield', next)}
                />
                <Toggle
                  label="Madman · max aggression"
                  checked={settings.madmanMode}
                  onChange={(next) => updateSetting('madmanMode', next)}
                />
                <Toggle
                  label="Auto game report"
                  checked={settings.gameReport}
                  onChange={(next) => updateSetting('gameReport', next)}
                />
                <Toggle
                  label="Opening book"
                  checked={settings.openingBook}
                  onChange={(next) => updateSetting('openingBook', next)}
                />
                {settings.openingBook && (
                  <div class="panel-opening-style-section">
                    <div class="panel-segmented panel-opening-style-picker">
                      {OPENING_STYLES.map((id) => (
                        <button
                          key={id}
                          type="button"
                          class="panel-segment"
                          aria-pressed={settings.openingStyle === id}
                          aria-label={OPENING_STYLE_PRESENTATION[id].label}
                          title={OPENING_STYLE_PRESENTATION[id].tooltip}
                          onClick={() => updateSetting('openingStyle', id)}
                        >
                          <OpeningStyleIcon style={id} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <hr class="panel-section-divider" />

              <div class="panel-timing-row">
                <span class="panel-timing-label">Timing mode</span>
                <div class="panel-segmented panel-timing-segmented">
                  {TIMING_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      class="panel-segment panel-timing-segment"
                      aria-pressed={settings.timingMode === mode}
                      aria-label={TIMING_MODE_PRESENTATION[mode].label}
                      title={TIMING_MODE_PRESENTATION[mode].tooltip}
                      onClick={() => updateSetting('timingMode', mode)}
                    >
                      {mode === 'dynamic' ? <BrainIcon /> : <LightningIcon />}
                      <span>{TIMING_MODE_PRESENTATION[mode].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Slider
                id="bot-depth"
                label="Depth cap"
                value={settings.botPower}
                min={MIN_BOT_POWER}
                max={MAX_BOT_POWER}
                step={1}
                format={String}
                onPreview={(value) => previewSlider('botPower', value)}
                onCommit={(value) => updateSetting('botPower', value)}
              />
              <Slider
                id="move-budget"
                label={settings.timingMode === 'dynamic' ? 'Move budget' : 'Move time'}
                value={settings.moveTime}
                min={MIN_MOVE_TIME}
                max={MAX_MOVE_TIME}
                step={25}
                format={formatBudget}
                onPreview={(value) => previewSlider('moveTime', value)}
                onCommit={(value) => updateSetting('moveTime', value)}
              />
              <Slider
                id="bot-elo"
                label="Target Elo"
                value={settings.targetElo}
                min={0}
                max={MAX_TARGET_ELO}
                step={50}
                format={(v) =>
                  v === 0 ? 'Max strength' : v >= MAX_TARGET_ELO ? `${v} (Max strength)` : `${v} Elo target`
                }
                onPreview={(value) => previewSlider('targetElo', value)}
                onCommit={(value) => updateSetting('targetElo', value)}
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
                  <span class="panel-count">{movePairs.length > 0 ? movePairs.length : logs.length}</span>
                </button>
                {activityOpen && (
                  <div class="panel-activity-actions">
                    <button
                      type="button"
                      class={`panel-icon-btn ${copied ? 'is-success' : ''}`}
                      aria-label={
                        copied
                          ? movePairs.length > 0
                            ? 'PGN copied to clipboard'
                            : 'Logs copied to clipboard'
                          : movePairs.length > 0
                            ? 'Copy PGN'
                            : 'Copy logs'
                      }
                      title={
                        copied
                          ? movePairs.length > 0
                            ? 'Copied PGN!'
                            : 'Copied logs!'
                          : movePairs.length > 0
                            ? 'Copy PGN'
                            : 'Copy logs'
                      }
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
                  aria-live="polite"
                  tabIndex={0}
                  onScroll={() => {
                    const log = logElement.current;
                    if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < LOG_STICK_PX;
                  }}
                >
                  {movePairs.length === 0 && logs.length === 0 ? (
                    <p class="panel-log-empty">Game moves and system events will appear here.</p>
                  ) : (
                    <>
                      {movePairs.length > 0 && <MoveScoresheet pairs={movePairs} />}
                      {logs
                        .filter(
                          (entry) =>
                            entry.type === 'error' ||
                            entry.type === 'warn' ||
                            entry.type === 'move' ||
                            movePairs.length === 0,
                        )
                        .map((entry) => (
                          <p key={entry.id} class={`panel-log-entry ${logTextClass[entry.type]}`}>
                            <time>{entry.time}</time>
                            <span>{entry.text}</span>
                          </p>
                        ))}
                    </>
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
