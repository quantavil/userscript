import {
  clearArrows,
  onBoardInput,
  onBoardMutation,
  startDomBoardWatcher,
  startMoveWatcher,
  stopMoveWatcher,
} from './board.js';
import { resetEngine, warmEngine } from './engine/analysis.js';
import { cancelAnalysis, scheduleAnalysis } from './engine/scheduler.js';
import { BotState, getFen, getGame, invalidateGameCache, isPlayersTurn, pa, Settings } from './state.js';
import { ui } from './ui.js';

class BotController {
  isActive = false;
  lastFenSeen = '';
  private game: unknown = null;
  private cleanup: (() => boolean) | null = null;
  private cleanupBoardInput: (() => boolean) | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private ready = false;
  private rematchAttempted = false;
  private waitingForBoard = false;
  private interruptedFen: string | null = null;
  private domWatcherStarted = false;

  init(): void {
    if (this.domWatcherStarted) return;
    this.domWatcherStarted = true;
    startDomBoardWatcher();
  }

  setEnabled(enabled: boolean): void {
    BotState.hackEnabled = Number(enabled);
    Settings.save();
    if (enabled) {
      this.init();
      void this.start();
    } else this.stop();
  }

  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    const generation = ++this.generation;
    BotState.statusInfo = 'Loading Stockfish...';
    ui.updateDisplay(pa());
    try {
      await warmEngine();
      if (!this.isActive || generation !== this.generation || !BotState.hackEnabled) return;
      this.ready = true;
      BotState.recoveryAction = null;
      this.cleanup = onBoardMutation(() => this.tick());
      this.cleanupBoardInput = onBoardInput(() => this.pauseForBoardInput());
      startMoveWatcher();
      // Recovery for board replacement, site API changes, and modal lifecycle.
      this.interval = setInterval(() => this.tick(), 1000);
      this.tick();
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      BotState.hackEnabled = 0;
      BotState.statusInfo = error instanceof Error ? error.message : 'Could not initialize Stockfish';
      BotState.recoveryAction = 'retry';
      ui.updateDisplay(pa());
    }
  }

  stop(): void {
    this.generation++;
    this.isActive = false;
    this.ready = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.cleanup?.();
    this.cleanup = null;
    this.cleanupBoardInput?.();
    this.cleanupBoardInput = null;
    stopMoveWatcher();
    cancelAnalysis();
    clearArrows();
    this.lastFenSeen = '';
    this.game = null;
    this.waitingForBoard = false;
    this.interruptedFen = null;
    this.clearRecommendation();
    BotState.recoveryAction = null;
    BotState.statusInfo = 'Bot disabled';
    ui.updateDisplay(pa());
  }

  private clearRecommendation(): void {
    BotState.bestMove = '-';
    BotState.currentEvaluation = '-';
    BotState.principalVariation = '-';
  }

  refreshSettings(): void {
    cancelAnalysis();
    if (BotState.recoveryAction === 'retry') BotState.recoveryAction = null;
    this.lastFenSeen = '';
    this.tick();
  }

  recover(): void {
    const action = BotState.recoveryAction;
    if (!action) return;
    if (action === 'retry') resetEngine();
    this.interruptedFen = null;
    this.lastFenSeen = '';
    BotState.recoveryAction = null;
    BotState.statusInfo = 'Resuming...';
    ui.updateDisplay(pa());
    if (!this.isActive) {
      BotState.hackEnabled = 1;
      Settings.save();
      this.init();
      void this.start();
      return;
    }
    this.tick();
  }

  private pauseForBoardInput(): void {
    if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
    invalidateGameCache();
    this.interruptedFen = getFen(getGame()) ?? '';
    cancelAnalysis();
    clearArrows();
    this.clearRecommendation();
    BotState.recoveryAction = 'resume';
    BotState.statusInfo = 'Paused after board interaction';
    ui.updateDisplay(pa());
  }

  tick(): void {
    if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
    invalidateGameCache();
    const game = getGame();
    if (!game) {
      if (this.waitingForBoard) return;
      this.waitingForBoard = true;
      cancelAnalysis();
      clearArrows();
      this.lastFenSeen = '';
      this.game = null;
      this.interruptedFen = null;
      this.clearRecommendation();
      BotState.recoveryAction = null;
      BotState.statusInfo = 'Waiting for board';
      ui.updateDisplay(pa());
      return;
    }
    this.waitingForBoard = false;
    if (game !== this.game) {
      cancelAnalysis();
      resetEngine();
      this.game = game;
      this.lastFenSeen = '';
      this.rematchAttempted = false;
      this.interruptedFen = null;
      this.clearRecommendation();
      BotState.recoveryAction = null;
      startMoveWatcher();
      ui.clearConsole();
    }
    if (game.isGameOver?.() || document.querySelector('.game-over-modal-content')) {
      cancelAnalysis();
      clearArrows();
      this.clearRecommendation();
      this.interruptedFen = null;
      BotState.recoveryAction = null;
      BotState.statusInfo = 'Game finished';
      ui.updateDisplay(pa());
      if (BotState.autoRematch && !this.rematchAttempted) {
        const button = document.querySelector<HTMLButtonElement>(
          '[data-cy="sidebar-game-over-rematch-button"], [data-cy="game-over-modal-rematch-button"]',
        );
        if (button) {
          button.click();
          this.rematchAttempted = true;
        }
      }
      return;
    }
    this.rematchAttempted = false;
    const fen = getFen(game);
    if (this.interruptedFen !== null) {
      if (!fen || fen === this.interruptedFen) return;
      this.interruptedFen = null;
      BotState.recoveryAction = null;
    }
    if (!fen || fen === this.lastFenSeen) return;
    cancelAnalysis(fen);
    clearArrows();
    this.clearRecommendation();
    this.lastFenSeen = fen;
    BotState.recoveryAction = null;
    const ourTurn = isPlayersTurn(game);
    BotState.statusInfo = ourTurn ? 'Analyzing...' : 'Waiting for opponent';
    ui.updateDisplay(pa());
    void scheduleAnalysis(ourTurn ? 'main' : 'ponder', fen);
  }
}

export const controller = new BotController();
