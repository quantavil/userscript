import type { Settings } from './types';

export const COMMENT_MIN = 1;
export const COMMENT_MAX = 30;

export const DEFAULT_SETTINGS: Settings = {
  title: true,
  tags: false,
  statement: true,
  examples: true,
  constraints: true,
  hints: true,
  codeTemplate: true,
  currentCode: true,
  failingTest: true,
  comments: false,
  commentCount: 10,
  prompt: '',
};

export const clampCommentCount = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(COMMENT_MAX, Math.max(COMMENT_MIN, v)) : DEFAULT_SETTINGS.commentCount;
};

/** Turn whatever is in storage (object, JSON string, garbage) into a valid Settings object. */
export function sanitizeSettings(raw: unknown): Settings {
  let src: unknown = raw;
  if (typeof src === 'string') {
    try {
      src = JSON.parse(src);
    } catch {
      src = null;
    }
  }
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (typeof src !== 'object' || src === null) return out;
  const rec = src as Record<string, unknown>;

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const v = rec[key];
    if (key === 'prompt') {
      if (typeof v === 'string') out.prompt = v;
    } else if (key === 'commentCount') {
      if (v !== undefined) out.commentCount = clampCommentCount(v);
    } else if (typeof v === 'boolean') {
      out[key] = v;
    }
  }
  return out;
}
