import {
  attachToBoard,
  clearArrows,
  onBoardInput,
  onBoardMutation,
  setBoardOrientation,
  startMoveWatcher,
  stopMoveWatcher,
} from './board.js';
import { resetEngine, warmEngine } from './engine/analysis.js';
import {
  cancelAnalysis,
  isMoveConfirmationPending,
  onMoveConfirmationSettled,
  scheduleAnalysis,
} from './engine/scheduler.js';
import { getSite, readSite } from './sites/index.js';
import type { GameSnapshot, SiteAdapter, SiteRead } from './sites/types.js';
import { BotState, pa, Settings } from './state.js';
import { ui } from './ui.js';

class BotController {
  isActive = false;
  lastFenSeen = '';
  private cleanup: (() => boolean) | null = null;
  private cleanupBoardInput: (() => boolean) | null = null;
  private cleanupSite: (() => void) | null = null;
  private cleanupConfirmation: (() => void) | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private ready = false;
  private waitingKey: string | null = null;
  private identity: object | null = null;
  private board: HTMLElement | null = null;
  private interruptedFen: string | null = null;
  private previousInputReady: boolean | null = null;
  private site: SiteAdapter | null = null;

  init(): void {
    if (this.cleanupSite) return;
    this.site = getSite();
    if (!this.site) return;
    this.cleanupConfirmation = onMoveConfirmationSettled(() => this.tick());
    this.cleanupSite = this.site.subscribe(() => {
      this.syncBoard();
      this.tick();
    });
    this.syncBoard();
  }

  private syncBoard(read = readSite()): void {
    if (read.kind !== 'game') {
      if (this.board) attachToBoard(null);
      this.board = null;
      return;
    }
    const snapshot = read.snapshot;
    if (snapshot.board !== this.board) {
      attachToBoard(snapshot.board);
      this.board = snapshot.board;
    }
    setBoardOrientation(snapshot.orientation);
  }

  private listenForLifecycle(): void {
    if (this.cleanup) return;
    this.cleanup = onBoardMutation(() => this.tick());
    this.cleanupBoardInput = onBoardInput(() => this.pauseForBoardInput());
    if (this.site?.id === 'chesscom') startMoveWatcher();
    this.interval = setInterval(() => this.tick(), 1000);
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
    this.init();
    if (!BotState.hackEnabled) {
      await warmEngine();
      return;
    }
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
      this.listenForLifecycle();
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
    this.cleanupSite?.();
    this.cleanupSite = null;
    this.cleanupConfirmation?.();
    this.cleanupConfirmation = null;
    stopMoveWatcher();
    cancelAnalysis();
    this.site?.cancelInput();
    clearArrows();
    if (this.board) attachToBoard(null);
    this.board = null;
    this.lastFenSeen = '';
    this.identity = null;
    this.waitingKey = null;
    this.interruptedFen = null;
    this.previousInputReady = null;
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

  private cancelSiteWork(): void {
    cancelAnalysis();
    this.site?.cancelInput();
  }

  private pauseForBoardInput(): void {
    if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
    const read = readSite();
    this.interruptedFen = read.kind === 'game' ? read.snapshot.fen : '';
    this.cancelSiteWork();
    clearArrows();
    this.clearRecommendation();
    BotState.recoveryAction = 'resume';
    BotState.statusInfo = 'Paused after board interaction';
    ui.updateDisplay(pa());
  }

  private clearForUnavailable(read: Exclude<SiteRead, { kind: 'game' }>): void {
    const waitingKey = `${read.kind}:${read.reason}`;
    if (this.identity && isMoveConfirmationPending(this.identity)) return;
    if (this.waitingKey === waitingKey) return;
    this.waitingKey = waitingKey;
    this.cancelSiteWork();
    clearArrows();
    if (this.board) attachToBoard(null);
    this.board = null;
    this.lastFenSeen = '';
    this.interruptedFen = null;
    this.previousInputReady = null;
    this.clearRecommendation();
    BotState.recoveryAction = null;
    BotState.statusInfo = read.reason;
    ui.updateDisplay(pa());
  }

  private handlePhase(snapshot: GameSnapshot): boolean {
    if (snapshot.phase === 'live') return false;
    const phaseKey = `phase:${snapshot.identity === this.identity ? snapshot.phase : `${snapshot.gameId}:${snapshot.phase}`}`;
    if (this.waitingKey !== phaseKey) {
      this.waitingKey = phaseKey;
      this.cancelSiteWork();
      clearArrows();
      this.clearRecommendation();
      this.lastFenSeen = '';
      this.interruptedFen = null;
      this.previousInputReady = snapshot.inputReady;
      BotState.recoveryAction = null;
      BotState.statusInfo = snapshot.phase === 'replay' ? 'Replay mode' : 'Game finished';
      ui.updateDisplay(pa());
    }
    return true;
  }

  tick(): void {
    if (!this.isActive || !this.ready || !BotState.hackEnabled) return;
    const read = readSite();
    this.syncBoard(read);
    if (read.kind !== 'game') {
      this.clearForUnavailable(read);
      return;
    }
    const snapshot = read.snapshot;
    if (snapshot.identity !== this.identity) {
      const hadIdentity = this.identity !== null;
      this.cancelSiteWork();
      if (hadIdentity) resetEngine();
      this.identity = snapshot.identity;
      this.lastFenSeen = '';
      this.waitingKey = null;
      this.interruptedFen = null;
      this.previousInputReady = null;
      this.clearRecommendation();
      BotState.recoveryAction = null;
      ui.clearConsole();
    }
    if (this.handlePhase(snapshot)) return;
    if (
      snapshot.identity === this.identity &&
      snapshot.fen !== this.lastFenSeen &&
      isMoveConfirmationPending(snapshot.identity)
    )
      return;
    this.waitingKey = null;

    const ourTurn = snapshot.sideToMove === snapshot.playerColor;
    const readinessRestored = this.previousInputReady === false && snapshot.inputReady && ourTurn;
    this.previousInputReady = snapshot.inputReady;
    if (readinessRestored && snapshot.sideToMove === snapshot.playerColor && snapshot.fen === this.lastFenSeen) {
      cancelAnalysis(snapshot.fen);
    }

    if (this.interruptedFen !== null) {
      if (!snapshot.fen || snapshot.fen === this.interruptedFen) return;
      this.interruptedFen = null;
      BotState.recoveryAction = null;
    }
    if (!snapshot.fen) return;
    const positionChanged = snapshot.fen !== this.lastFenSeen;
    if (!positionChanged && !readinessRestored) return;
    if (positionChanged) cancelAnalysis(snapshot.fen);
    clearArrows();
    this.clearRecommendation();
    this.lastFenSeen = snapshot.fen;
    BotState.recoveryAction = null;

    if (ourTurn && !snapshot.inputReady) {
      BotState.statusInfo = 'Waiting for board';
      ui.updateDisplay(pa());
      return;
    }
    BotState.statusInfo = ourTurn ? 'Analyzing...' : 'Waiting for opponent';
    ui.updateDisplay(pa());
    void scheduleAnalysis(ourTurn ? 'main' : 'ponder', snapshot.fen);
  }
}

export const controller = new BotController();
