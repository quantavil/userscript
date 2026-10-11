export interface Evaluation {
  cp?: number;
  mate?: number;
}

export type RecoveryAction = 'resume' | 'retry';

export type OpeningStyle = 'hyper-defensive' | 'defensive' | 'balanced' | 'aggressive' | 'hyper-aggressive';

export type TimingMode = 'dynamic' | 'fixed';

export interface CandidateLine {
  multipv: number;
  uci: string;
  san?: string;
  evaluation: Evaluation;
  depth: number;
  pv: string;
}

export interface BotState {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  timingMode: TimingMode;
  autoMove: number;
  openingBook: number;
  openingStyle: OpeningStyle;
  currentEvaluation: string;
  bestMove: string;
  principalVariation: string;
  statusInfo: string;
  recoveryAction: RecoveryAction | null;
  ponderEnabled: number;
  targetElo: number;
  blunderShield: number;
  ghostMode: number;
  autoRetry: number;
  multiPvLines?: CandidateLine[];
  evalHistory?: number[];
  onUpdateDisplay?: (playingAs: number) => void;
}

export interface SettingsData {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  timingMode: TimingMode;
  autoMove: number;
  openingBook: number;
  openingStyle: OpeningStyle;
  ponderEnabled: number;
  targetElo: number;
  blunderShield: number;
  ghostMode: number;
  autoRetry: number;
  menuPosition: { top: string; left: string } | null;
}
