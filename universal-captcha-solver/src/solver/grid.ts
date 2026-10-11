import { AnswerError } from './answer.ts';

const DEFAULT_SIZE = 3;

/** Tiles per side: the configured size, else the square root of the tile count, else 3. */
export function resolveGridSize(configured: number, tileCount: number): number {
  if (configured > 0) return configured;
  const side = Math.round(Math.sqrt(tileCount));
  return side >= 2 && side * side === tileCount ? side : DEFAULT_SIZE;
}

export function buildGridPrompt(size: number, instruction: string, hint = ''): string {
  const last = size * size;
  return [
    `The image is a CAPTCHA laid out as a ${size}x${size} grid of tiles.`,
    `Tiles are numbered 1 to ${last} left-to-right, top-to-bottom: 1 is top-left, ${size} is top-right, ${last} is bottom-right. Each tile shows its number in its top-left corner.`,
    instruction ? `Task: ${instruction}` : '',
    'Select every tile that matches the task. If the grid is one picture split into tiles, select every tile containing any part of the object.',
    `Reply with ONLY JSON, no explanation: {"tiles":[...]} listing the matching tile numbers, or {"tiles":[]} if none match.`,
    hint,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Turns a model reply into sorted, unique 1-based tile numbers, or throws AnswerError. */
export function parseGridAnswer(raw: string, total: number): number[] {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/<think>/i.test(text)) throw new AnswerError('Model returned reasoning instead of an answer');
  text = text.replace(/```[a-z]*/gi, '').trim();

  // The JSON may be wrapped in prose; take the last object or array in the reply.
  const json = text.match(/\{[^{}]*\}|\[[^[\]]*\]/g)?.at(-1);
  if (!json) throw new AnswerError(`Expected JSON tile list, got "${text.slice(0, 40)}"`);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new AnswerError(`Could not parse "${json.slice(0, 40)}"`);
  }
  const list = Array.isArray(data) ? data : (data as { tiles?: unknown })?.tiles;
  if (!Array.isArray(list)) throw new AnswerError('Reply has no "tiles" list');

  const out = new Set<number>();
  for (const item of list) {
    const n = typeof item === 'string' ? Number(item.trim()) : item;
    // A bad index means the model misread the layout; clicking a guess would just fail the captcha.
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > total) {
      throw new AnswerError(`Tile "${String(item)}" is not between 1 and ${total}`);
    }
    out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}
