import { onBoardInput } from '../board/input.js';
import { attachToBoard, clearArrows, setBoardOrientation } from '../board/overlays.js';
import { resetEngine, warmEngine } from '../engine/service.js';
import { gameHistoryTracker } from '../game/history.js';
import { cancelGameReport, resetGameReport, runGameReport } from '../game/report/analyzer.js';
import { Settings } from '../settings/storage.js';
import { getSite, readSite } from '../sites/registry.js';
import type { GameSnapshot, SiteAdapter, SiteRead } from '../sites/types.js';
import { ui } from '../ui/mount.js';
import {
  cancelAnalysis,
  isMoveConfirmationPending,
  onMoveConfirmationSettled,
  resetRecovery,
  scheduleAnalysis,
} from './scheduler.js';
import { BotState, clearRecommendation } from './state.js';

function formatPhaseKey(snapshot: GameSnapshot, currentIdentity: object | null): string {
  const scope = snapshot.identity === currentIdentity ? snapshot.phase : `${snapshot.gameId}:${snapshot.phase}`;
  return `phase:${scope}`;
}

class BotController {
  isActive = false;
  lastFenSeen = '';
  private cleanupBoardInput: (() => boolean) | null = null;
  private cleanupSite: (() => void) | null = null;
  private cleanupConfirmation: (() => void) | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private reportGeneration = 0;
  private automaticReportSuppressed = false;
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
      const read = readSite();
      if (read.kind !== 'game' || read.snapshot.phase !== 'finished') this.invalidateReport();
      this.syncBoard(read);
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
    if (this.interval) return;
    this.cleanupBoardInput = onBoardInput(() => this.pauseForBoardInput());
    this.interval = setInterval(() => this.tick(), 1000);
  }

  setEnabled(enabled: boolean): void {
    BotState.hackEnabled = enabled;
    Settings.save();
    if (enabled) {
      this.init();
      void this.start();
    } else {
      this.stop();
      this.init();
    }
  }

  async start(): Promise<void> {
    this.init();
    if (!BotState.hackEnabled) {
      await warmEngine();
      return;
    }
    if (this.isActive) return;
    this.invalidateReport();
    resetRecovery();
    this.isActive = true;
    const generation = ++this.generation;
    BotState.statusInfo = 'Loading Stockfish...';
    ui.updateDisplay();
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
      BotState.hackEnabled = false;
      BotState.statusInfo = error instanceof Error ? error.message : 'Could not initialize Stockfish';
      BotState.recoveryAction = 'retry';
      ui.updateDisplay();
    }
  }

  stop(): void {
    this.invalidateReport();
    resetRecovery();
    this.generation++;
    this.isActive = false;
    this.ready = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.cleanupBoardInput?.();
    this.cleanupBoardInput = null;
    this.cleanupSite?.();
    this.cleanupSite = null;
    this.cleanupConfirmation?.();
    this.cleanupConfirmation = null;
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
    ui.updateDisplay();
  }

  private clearRecommendation(): void {
    clearRecommendation();
  }

  refreshSettings(): void {
    this.invalidateReport();
    resetRecovery();
    cancelAnalysis();
    if (BotState.recoveryAction === 'retry') BotState.recoveryAction = null;
    this.lastFenSeen = '';
    this.tick();
  }

  recover(): void {
    const action = BotState.recoveryAction;
    if (!action) return;
    if (action === 'retry') {
      resetEngine();
      resetRecovery();
    }
    this.interruptedFen = null;
    this.lastFenSeen = '';
    BotState.recoveryAction = null;
    BotState.statusInfo = 'Resuming...';
    ui.updateDisplay();
    if (!this.isActive) {
      BotState.hackEnabled = true;
      Settings.save();
      this.init();
      void this.start();
      return;
    }
    this.tick();
  }

  cancelReport(): void {
    this.automaticReportSuppressed = true;
    this.invalidateReport();
  }

  private invalidateReport(): void {
    this.reportGeneration++;
    cancelGameReport();
  }

  async generateReport(force = true): Promise<void> {
    const read = readSite();
    if (read.kind !== 'game' || read.snapshot.phase !== 'finished') return;
    if (!force && this.automaticReportSuppressed) return;
    if (force) this.automaticReportSuppressed = false;
    const snapshot = read.snapshot;
    gameHistoryTracker.updateFromSnapshot(snapshot);
    const generation = this.reportGeneration;
    const isEligible = () => {
      const current = readSite();
      return (
        generation === this.reportGeneration &&
        current.kind === 'game' &&
        current.snapshot.identity === snapshot.identity &&
        current.snapshot.phase === 'finished'
      );
    };
    await runGameReport(
      gameHistoryTracker.getMoves(),
      gameHistoryTracker.getStartFen(),
      snapshot.gameId,
      BotState.reportDepth,
      force,
      { variant: snapshot.variant, isEligible },
    );
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
    ui.updateDisplay();
  }

  private clearForUnavailable(read: Exclude<SiteRead, { kind: 'game' }>): void {
    const waitingKey = `${read.kind}:${read.reason}`;
    if (this.identity && isMoveConfirmationPending(this.identity)) return;
    if (this.waitingKey === waitingKey) return;
    this.waitingKey = waitingKey;
    this.invalidateReport();
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
    ui.updateDisplay();
  }

  private handlePhase(snapshot: GameSnapshot): boolean {
    if (snapshot.phase === 'live') return false;
    const phaseKey = formatPhaseKey(snapshot, this.identity);
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
      ui.updateDisplay();
    }
    if (snapshot.phase === 'finished' && BotState.gameReport) {
      void this.generateReport(false);
    }
    return true;
  }

  tick(): void {
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
      this.invalidateReport();
      resetGameReport();
      this.automaticReportSuppressed = false;
      BotState.evalHistory = [];
      this.identity = snapshot.identity;
      this.lastFenSeen = '';
      this.waitingKey = null;
      this.interruptedFen = null;
      this.previousInputReady = null;
      this.clearRecommendation();
      BotState.recoveryAction = null;
      ui.clearConsole();
      gameHistoryTracker.reset(snapshot.gameId, snapshot.history?.startFen, performance.now(), snapshot.variant);
    }
    gameHistoryTracker.updateFromSnapshot(snapshot);
    if (this.handlePhase(snapshot)) return;

    if (!this.isActive || !this.ready || !BotState.hackEnabled) {
      ui.updateDisplay();
      return;
    }

    this.invalidateReport();
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
    this.lastFenSeen = snapshot.fen;
    BotState.recoveryAction = null;

    if (ourTurn && !snapshot.inputReady) {
      BotState.statusInfo = 'Waiting for board';
      ui.updateDisplay();
      return;
    }
    BotState.statusInfo = ourTurn ? 'Analyzing...' : 'Waiting for opponent';
    ui.updateDisplay();
    void scheduleAnalysis(ourTurn ? 'main' : 'ponder', snapshot.fen);
  }
}

export const controller = new BotController();
