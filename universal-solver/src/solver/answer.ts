import type { SiteRule } from '../config/schema.ts';

export class AnswerError extends Error {
  override name = 'AnswerError';
}

type Shape = Pick<SiteRule, 'kind' | 'charset' | 'caseMode' | 'minLength' | 'maxLength' | 'hint'>;

const CHARSET_NAME = {
  alnum: 'letters and digits only',
  alpha: 'letters only',
  digits: 'digits only',
  any: '',
} as const;

export function buildPrompt(rule: Shape): string {
  if (rule.kind === 'math') {
    return [
      'The image shows a simple arithmetic CAPTCHA.',
      'Compute it and reply with ONLY the final number: no words, no equals sign, no explanation.',
      rule.hint,
    ]
      .filter(Boolean)
      .join(' ');
  }
  const parts = [
    'You are an OCR engine reading a distorted-text CAPTCHA.',
    'Transcribe the characters exactly as they appear. Reply with ONLY those characters: no spaces, quotes, punctuation or explanation.',
  ];
  if (CHARSET_NAME[rule.charset]) parts.push(`The answer contains ${CHARSET_NAME[rule.charset]}.`);
  if (rule.maxLength && rule.maxLength === rule.minLength)
    parts.push(`It is exactly ${rule.maxLength} characters long.`);
  else if (rule.maxLength) parts.push(`It is ${rule.minLength} to ${rule.maxLength} characters long.`);
  if (rule.hint) parts.push(rule.hint);
  return parts.join(' ');
}

const ALLOWED: Record<SiteRule['charset'], RegExp> = {
  alnum: /[^A-Za-z0-9]/g,
  alpha: /[^A-Za-z]/g,
  digits: /[^0-9]/g,
  any: /\s/g,
};

/** Turns a model reply into a fillable answer, or throws AnswerError. */
export function normalizeAnswer(raw: string, rule: Shape): string {
  // Reasoning models may leak <think> blocks; drop closed ones, and treat an unclosed one as a failure.
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/<think>/i.test(text)) throw new AnswerError('Model returned reasoning instead of an answer');
  text = text.replace(/```[a-z]*/gi, '').trim();

  // Models sometimes preface the answer; the answer is the last non-empty line.
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines.at(-1) ?? '';
  if (!last) throw new AnswerError('Empty answer');

  if (rule.kind === 'math') {
    const nums = last.match(/-?\d+(?:\.\d+)?/g);
    const n = nums?.at(-1);
    if (!n) throw new AnswerError(`Could not read a number from "${last.slice(0, 40)}"`);
    return n;
  }

  let answer = last.replace(ALLOWED[rule.charset], '');
  if (rule.caseMode === 'upper') answer = answer.toUpperCase();
  else if (rule.caseMode === 'lower') answer = answer.toLowerCase();

  if (answer.length < rule.minLength) {
    throw new AnswerError(`Answer "${answer}" is shorter than ${rule.minLength} characters`);
  }
  if (rule.maxLength && answer.length > rule.maxLength) {
    throw new AnswerError(`Answer "${answer}" is longer than ${rule.maxLength} characters`);
  }
  return answer;
}
