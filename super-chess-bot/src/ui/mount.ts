import { BotState } from '../app/state.js';
import { markBotNode } from '../board/ownership.js';
import { uciListToSan, uciSequenceToSan, uciToSan } from '../chess/notation.js';
import type { CandidateLine } from '../chess/types.js';
import { Settings, setMenuPositionGetter } from '../settings/storage.js';
import { readSite } from '../sites/registry.js';
import panelCss from './panel.css?inline';
import {
  appendPanelLog,
  clearPanelLogs,
  mountPanel,
  type PanelActions,
  type PanelLogType,
  syncPanelSettings,
  updatePanelAnalysis,
} from './panel.js';
import { isErrorStatus, isRoutineStatus } from './status.js';

interface UI {
  /** Shadow DOM host. Its inline position is persisted by Settings.save(). */
  menuWrap: HTMLDivElement | null;
  lastStatus: string;
  log(msg: string, type?: PanelLogType): void;
  clearConsole(): void;
  updateDisplay(): void;
}

// The panel compares analysis arrays by element identity, so a fresh `{ ...line, san }` build on
// every update would always look like a change. Reuse the last array while it still matches.
let lastMultiPvSource: readonly CandidateLine[] | null = null;
let lastMultiPvLines: CandidateLine[] = [];

function multiPvWithSans(
  lines: readonly CandidateLine[],
  sans: readonly string[],
  fen?: string | null,
  variant?: string,
): CandidateLine[] {
  if (lines === lastMultiPvSource) {
    const unchanged =
      lastMultiPvLines.length === sans.length && sans.every((san, index) => lastMultiPvLines[index]?.san === san);
    if (unchanged) return lastMultiPvLines;
  }
  lastMultiPvSource = lines;
  lastMultiPvLines = lines.map((line, index) => ({
    ...line,
    san: sans[index],
    pv: fen ? uciSequenceToSan(fen, line.pv, variant) : line.pv,
  }));
  return lastMultiPvLines;
}

export const ui: UI = {
  menuWrap: null,
  lastStatus: '',

  log(msg, type = 'info') {
    appendPanelLog(msg, type);
  },

  clearConsole() {
    clearPanelLogs();
    this.lastStatus = '';
  },

  updateDisplay() {
    syncPanelSettings();
    const read = readSite();
    const snapshot = read.kind === 'game' ? read.snapshot : null;
    const fen = snapshot?.fen ?? null;
    const san =
      fen && BotState.bestMove !== '-' ? uciToSan(fen, BotState.bestMove, snapshot?.variant) : BotState.bestMove;
    const suggestedMove = fen ? san : BotState.bestMove;
    const formattedPv =
      fen && BotState.principalVariation !== '-'
        ? uciSequenceToSan(fen, BotState.principalVariation, snapshot?.variant)
        : BotState.principalVariation;
    if (BotState.statusInfo !== this.lastStatus) {
      if (!isRoutineStatus(BotState.statusInfo)) {
        const type = BotState.recoveryAction === 'retry' || isErrorStatus(BotState.statusInfo) ? 'error' : 'status';
        this.log(BotState.statusInfo, type);
      }
      this.lastStatus = BotState.statusInfo;
    }

    // Every Multi-PV line is resolved against one parsed position, not one parse per line.
    const lines = BotState.multiPvLines ?? [];
    const sans = fen
      ? uciListToSan(
          fen,
          lines.map((line) => line.uci),
          snapshot?.variant,
        )
      : lines.map((line) => line.uci);

    updatePanelAnalysis({
      status: BotState.statusInfo,
      evaluation: BotState.currentEvaluation,
      bestMove: suggestedMove,
      principalVariation: formattedPv,
      recoveryAction: BotState.recoveryAction,
      reportAvailable: !!snapshot && snapshot.phase === 'finished',
      multiPvLines: multiPvWithSans(lines, sans, fen, snapshot?.variant),
      evalHistory: BotState.evalHistory ?? [],
    });
  },
};

export async function buildUI(actions: PanelActions = {}): Promise<void> {
  if (ui.menuWrap) return;

  const host = document.createElement('div');
  markBotNode(host);
  host.style.top = '20px';
  host.style.right = '20px';

  const saved = Settings.load();
  syncPanelSettings();
  if (saved?.menuPosition) {
    host.style.top = saved.menuPosition.top || '20px';
    host.style.left = saved.menuPosition.left || '';
    host.style.right = saved.menuPosition.left ? 'auto' : '20px';
  }
  if (BotState.ghostMode) {
    host.style.display = 'none';
  }

  const shadowRoot = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = panelCss;
  const appRoot = document.createElement('div');
  appRoot.id = 'panelRoot';
  shadowRoot.append(style, appRoot);

  document.body.appendChild(host);
  ui.menuWrap = host;
  setMenuPositionGetter(() => (ui.menuWrap ? { top: ui.menuWrap.style.top, left: ui.menuWrap.style.left } : null));
  mountPanel(appRoot, host, {
    ...actions,
    clearConsole: () => ui.clearConsole(),
  });
}
