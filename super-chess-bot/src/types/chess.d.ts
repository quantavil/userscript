export interface Move {
  from: number;
  to: number;
  flags: number;
  piece: number;
  captured: number;
  promo?: number;
}

export interface Evaluation {
  cp?: number;
  mate?: number;
}

export type RecoveryAction = 'resume' | 'retry';

export interface BotState {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  autoMove: number;
  currentEvaluation: string;
  bestMove: string;
  principalVariation: string;
  statusInfo: string;
  recoveryAction: RecoveryAction | null;
  ponderEnabled: number;
  autoRematch: number;
  moveMethod: 'click' | 'drag';
  onUpdateDisplay?: (playingAs: number) => void;
}

export interface SettingsData {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  autoMove: number;
  ponderEnabled: number;
  autoRematch: number;
  moveMethod: 'click' | 'drag';
  menuPosition: { top: string; left: string } | null;
}
