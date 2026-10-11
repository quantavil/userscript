export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PromotionOptionLike {
  dataset?: Record<string, string | undefined>;
  getAttribute?: (name: string) => string | null;
  className?: string | { baseVal?: string };
  textContent?: string | null;
}

const pieceNames: Record<PromotionPiece, string> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

function pieceFromToken(token: string): PromotionPiece | null {
  const value = token.toLowerCase();
  if (value === 'q' || value === 'r' || value === 'b' || value === 'n') return value;
  if (/^[wb][qrbn]$/.test(value)) return value[1] as PromotionPiece;
  return (Object.entries(pieceNames).find(([, name]) => name === value)?.[0] as PromotionPiece | undefined) ?? null;
}

/** Identify a promotion piece only from a complete identifier or name token. */
export function promotionPieceFromLabel(label: unknown): PromotionPiece | null {
  if (typeof label !== 'string') return null;
  const tokens = label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const pieces = new Set(tokens.map(pieceFromToken).filter((piece): piece is PromotionPiece => piece !== null));
  return pieces.size === 1 ? (pieces.values().next().value ?? null) : null;
}

/** Find an exact option; generic promotion classes never count as a piece. */
export function findPromotionOption<T extends PromotionOptionLike>(options: readonly T[], requested: string): T | null {
  const piece = promotionPieceFromLabel(requested);
  if (!piece) return null;
  for (const option of options) {
    const className = typeof option.className === 'string' ? option.className : option.className?.baseVal;
    const labels = [
      option.dataset?.piece,
      option.dataset?.pieceType,
      option.dataset?.testElement,
      option.getAttribute?.('data-piece'),
      option.getAttribute?.('data-piece-type'),
      option.getAttribute?.('data-test-element'),
      option.getAttribute?.('aria-label'),
      option.getAttribute?.('title'),
      className,
      option.textContent,
    ];
    if (labels.some((label) => promotionPieceFromLabel(label) === piece)) return option;
  }
  return null;
}
