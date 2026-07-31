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

export interface BotState {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  autoMove: number;
  currentEvaluation: string;
  bestMove: string;
  principalVariation: string;
  statusInfo: string;
  premoveEnabled: number;
  autoRematch: number;
  moveMethod: 'click' | 'drag';
  jitter: number;
  onUpdateDisplay?: (playingAs: number) => void;
}

export interface SettingsData {
  hackEnabled: number;
  botPower: number;
  moveTime: number;
  autoMove: number;
  premoveEnabled: number;
  autoRematch: number;
  moveMethod: 'click' | 'drag';
  jitter: number;
  menuPosition: { top: string; left: string } | null;
}
