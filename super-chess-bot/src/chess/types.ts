export interface Evaluation {
  cp?: number;
  mate?: number;
}

export type RecoveryAction = 'resume' | 'retry';

export type OpeningStyle = 'hyper-defensive' | 'defensive' | 'balanced' | 'aggressive' | 'hyper-aggressive';

export type TimingMode = 'dynamic' | 'fixed';

/** One candidate line of a Multi-PV search, exactly as the engine reported it. */
export interface MultiPvLine {
  multipv: number;
  uci: string;
  pv: string;
  evaluation: Evaluation;
  depth: number;
  nodes?: number;
  time?: number;
}

/** A Multi-PV line as the panel consumes it, with the display SAN resolved from the position. */
export interface CandidateLine extends MultiPvLine {
  san?: string;
}

export interface BotState {
  hackEnabled: boolean;
  botPower: number;
  moveTime: number;
  timingMode: TimingMode;
  autoMove: boolean;
  openingBook: boolean;
  openingStyle: OpeningStyle;
  currentEvaluation: string;
  bestMove: string;
  principalVariation: string;
  statusInfo: string;
  recoveryAction: RecoveryAction | null;
  ponderEnabled: boolean;
  targetElo: number;
  blunderShield: boolean;
  madmanMode: boolean;
  ghostMode: boolean;
  autoRetry: boolean;
  premove: boolean;
  gameReport: boolean;
  reportDepth: number;
  multiPvLines?: CandidateLine[];
  evalHistory?: number[];
  onUpdateDisplay?: () => void;
}

/** Preference keys. `SettingsData` is derived from `BotState` through this list. */
export type PreferenceKey =
  | 'hackEnabled'
  | 'botPower'
  | 'moveTime'
  | 'timingMode'
  | 'autoMove'
  | 'openingBook'
  | 'openingStyle'
  | 'ponderEnabled'
  | 'targetElo'
  | 'blunderShield'
  | 'madmanMode'
  | 'ghostMode'
  | 'autoRetry'
  | 'premove'
  | 'gameReport'
  | 'reportDepth';

export type PanelPosition = { top: string; left: string };

export interface SettingsData extends Pick<BotState, PreferenceKey> {
  menuPosition: PanelPosition | null;
}
