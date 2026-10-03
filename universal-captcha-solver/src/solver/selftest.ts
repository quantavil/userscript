import type { SiteRule } from '../config/schema.ts';
import type { Provider, ProviderConfig } from '../providers/types.ts';
import { buildPrompt, normalizeAnswer } from './answer.ts';
import { configProblem } from './controller.ts';
import { explainError } from './errors.ts';

const ALPHABET = 'ACDEFGHJKLMNPRTUVWXY34679'; // no look-alikes (0/O, 1/I, 5/S, 2/Z, 8/B)

/** Draws a small distorted captcha so key, model and vision support can be verified in one call. */
export function renderTestCard(): { base64: string; answer: string } {
  const answer = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 56;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, 160, 56);
  ctx.strokeStyle = '#8884';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 160, Math.random() * 56);
    ctx.lineTo(Math.random() * 160, Math.random() * 56);
    ctx.stroke();
  }
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#222';
  ctx.textBaseline = 'middle';
  [...answer].forEach((ch, i) => {
    ctx.save();
    ctx.translate(22 + i * 33, 28 + (Math.random() - 0.5) * 8);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.fillText(ch, -10, 0);
    ctx.restore();
  });
  return { base64: canvas.toDataURL('image/png').split(',')[1] ?? '', answer };
}

export interface TestResult {
  ok: boolean;
  text: string;
}

const RULE: Pick<SiteRule, 'kind' | 'charset' | 'caseMode' | 'minLength' | 'maxLength' | 'hint'> = {
  kind: 'text',
  charset: 'alnum',
  caseMode: 'upper',
  minLength: 4,
  maxLength: 4,
  hint: '',
};

export async function testProvider(provider: Provider, cfg: ProviderConfig): Promise<TestResult> {
  const problem = configProblem(provider, cfg);
  if (problem) return { ok: false, text: problem };
  const card = renderTestCard();
  const started = performance.now();
  try {
    const raw = await provider.complete(cfg, {
      image: { mime: 'image/png', base64: card.base64 },
      prompt: buildPrompt(RULE),
    });
    const ms = Math.round(performance.now() - started);
    const read = normalizeAnswer(raw, RULE);
    return read === card.answer
      ? { ok: true, text: `Works: read "${read}" in ${ms} ms` }
      : { ok: true, text: `Connected (${ms} ms), but read "${read}" for "${card.answer}". Accuracy varies by model` };
  } catch (e) {
    return { ok: false, text: explainError(e) };
  }
}
