import type { Rules } from 'chessops/types';

export interface VariantDefinition {
  readonly id: string;
  readonly rules: Rules;
  readonly chess960: boolean;
}

const standard: VariantDefinition = {
  id: 'standard',
  rules: 'chess',
  chess960: false,
};

const chess960: VariantDefinition = {
  ...standard,
  id: 'chess960',
  chess960: true,
};

/** Shared identity mapping; only standard chess and Chess960 are supported. */
export function getVariantDefinition(variant?: string): VariantDefinition | null {
  const key = (variant || 'standard').toLowerCase().replace(/[\s_-]/g, '');
  if (key === 'chess' || key === 'fromposition' || key === 'standard') return standard;
  if (key === 'chess960' || key === 'fischerandom') return chess960;
  return null;
}
