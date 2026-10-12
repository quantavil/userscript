import { markBotNode, updateEvaluationBar } from './board.js';
import { uciToSan } from './engine/san.js';
import { gameHistoryTracker } from './game-history.js';
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
import { resetGameReport } from './report/analyzer.js';
import { readSite } from './sites/index.js';
import type { SiteCapabilities } from './sites/types.js';
import { BotState, Settings, setMenuPositionGetter } from './state.js';

interface UI {
  /** Shadow DOM host. Its inline position is persisted by Settings.save(). */
  menuWrap: HTMLDivElement | null;
  lastStatus: string;
  lastBestMove: string;
  log(msg: string, type?: PanelLogType): void;
  clearConsole(): void;
  updateDisplay(playingAs: number): void;
}

function isRoutineStatus(status: string): boolean {
  return /^(?:Bot disabled|Preparing Stockfish|Loading Stockfish|Analyzing|Pondering|Submitting move|Move confirmed|Waiting for opponent|Waiting for board|Ready ·|Resuming\.\.\.)/.test(
    status,
  );
}

function isErrorStatus(status: string): boolean {
  return /error|failed|not confirmed|unavailable|crashed/i.test(status);
}

export const ui: UI = {
  menuWrap: null,
  lastStatus: '',
  lastBestMove: '',

  log(msg, type = 'info') {
    appendPanelLog(msg, type);
  },

  clearConsole() {
    clearPanelLogs();
    gameHistoryTracker.reset();
    resetGameReport();
    this.lastStatus = '';
    this.lastBestMove = '';
  },

  updateDisplay(playingAs) {
    syncPanelSettings();
    const read = readSite();
    const snapshot = read.kind === 'game' ? read.snapshot : null;
    const fen = snapshot?.fen ?? null;
    const san = fen && BotState.bestMove !== '-' ? uciToSan(fen, BotState.bestMove) : BotState.bestMove;
    const suggestedMove = typeof san === 'string' ? san : BotState.bestMove;
    if (BotState.statusInfo !== this.lastStatus) {
      if (!isRoutineStatus(BotState.statusInfo)) {
        const type = BotState.recoveryAction === 'retry' || isErrorStatus(BotState.statusInfo) ? 'error' : 'status';
        this.log(BotState.statusInfo, type);
      }
      this.lastStatus = BotState.statusInfo;
    }

    // Track best move changes without flooding the log with redundant raw evaluations.
    if (BotState.bestMove !== '-' && BotState.bestMove !== this.lastBestMove) {
      this.lastBestMove = BotState.bestMove;
    }

    updatePanelAnalysis({
      status: BotState.statusInfo,
      evaluation: BotState.currentEvaluation,
      bestMove: suggestedMove,
      principalVariation: BotState.principalVariation,
      recoveryAction: BotState.recoveryAction,
      ...(BotState.multiPvLines
        ? {
            multiPvLines: BotState.multiPvLines.map((line) => {
              const sanVal = fen && line.uci ? uciToSan(fen, line.uci) : line.uci;
              return {
                ...line,
                san: typeof sanVal === 'string' ? sanVal : line.uci,
              };
            }),
          }
        : {}),
      ...(BotState.evalHistory && BotState.evalHistory.length > 0 ? { evalHistory: BotState.evalHistory } : {}),
    });
    updateEvaluationBar(BotState.currentEvaluation, playingAs);
  },
};

export async function buildUI(actions: PanelActions = {}, capabilities?: SiteCapabilities): Promise<void> {
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
  mountPanel(
    appRoot,
    host,
    {
      ...actions,
      clearConsole: () => ui.clearConsole(),
    },
    capabilities,
  );
}
