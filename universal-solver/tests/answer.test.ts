import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { SiteRuleSchema } from '../src/config/schema.ts';
import { AnswerError, buildPrompt, normalizeAnswer } from '../src/solver/answer.ts';

const rule = (o: Record<string, unknown> = {}) => v.parse(SiteRuleSchema, { captcha: 'img', input: 'input', ...o });

describe('normalizeAnswer', () => {
  test('strips whitespace, quotes and punctuation', () => {
    expect(normalizeAnswer(' "aB 3-9" \n', rule())).toBe('aB39');
  });
  test('takes the last non-empty line when the model explains itself', () => {
    expect(normalizeAnswer('The captcha reads:\nX7Q2\n', rule())).toBe('X7Q2');
  });
  test('takes the part after a colon when the preface is on the same line', () => {
    expect(normalizeAnswer('The answer is: K3PZ', rule())).toBe('K3PZ');
    expect(normalizeAnswer('Answer: 12', rule({ kind: 'math' }))).toBe('12');
  });
  test('removes closed <think> blocks (reasoning models)', () => {
    expect(normalizeAnswer('<think>hmm 1234?</think>\nK3PZ', rule())).toBe('K3PZ');
  });
  test('rejects an unterminated <think> block rather than filling reasoning text', () => {
    expect(() => normalizeAnswer('<think>let me see the letters', rule())).toThrow(AnswerError);
  });
  test('strips code fences', () => {
    expect(normalizeAnswer('```\nAB12\n```', rule())).toBe('AB12');
  });
  test('charset digits drops letters (O -> removed, not guessed)', () => {
    expect(normalizeAnswer('48O1', rule({ charset: 'digits', minLength: 3 }))).toBe('481');
  });
  test('case folding', () => {
    expect(normalizeAnswer('aBc9', rule({ caseMode: 'upper' }))).toBe('ABC9');
    expect(normalizeAnswer('aBc9', rule({ caseMode: 'lower' }))).toBe('abc9');
  });
  test('length bounds are enforced', () => {
    expect(() => normalizeAnswer('ab', rule({ minLength: 4 }))).toThrow(/shorter/);
    expect(() => normalizeAnswer('abcdefg', rule({ maxLength: 5 }))).toThrow(/longer/);
  });
  test('math mode extracts the final number', () => {
    expect(normalizeAnswer('3 + 4 = 7', rule({ kind: 'math' }))).toBe('7');
    expect(normalizeAnswer('-12', rule({ kind: 'math' }))).toBe('-12');
    expect(() => normalizeAnswer('seven', rule({ kind: 'math' }))).toThrow(AnswerError);
  });
  test('empty reply fails', () => {
    expect(() => normalizeAnswer('  \n ', rule())).toThrow(/Empty/);
  });
});

describe('buildPrompt', () => {
  test('mentions constraints and the custom hint', () => {
    const p = buildPrompt(
      rule({ charset: 'digits', minLength: 5, maxLength: 5, hint: 'Ignore the strike-through line' }),
    );
    expect(p).toContain('digits only');
    expect(p).toContain('exactly 5');
    expect(p).toContain('strike-through');
  });
  test('math prompt asks for the number only', () => {
    expect(buildPrompt(rule({ kind: 'math' }))).toContain('ONLY the final number');
  });
});
