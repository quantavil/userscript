import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { SiteRuleSchema } from '../src/config/schema.ts';
import { pointIn } from '../src/dom/click.ts';
import { AnswerError } from '../src/solver/answer.ts';
import { buildGridPrompt, parseGridAnswer, resolveGridSize } from '../src/solver/grid.ts';

describe('parseGridAnswer', () => {
  test('reads {"tiles":[...]}, dedupes and sorts', () => {
    expect(parseGridAnswer('{"tiles":[7,1,4,1]}', 9)).toEqual([1, 4, 7]);
  });
  test('accepts a bare array, numeric strings, code fences and surrounding prose', () => {
    expect(parseGridAnswer('Sure!\n```json\n["2", 5]\n```', 9)).toEqual([2, 5]);
    expect(parseGridAnswer('The buses are in: {"tiles": [3, 6]}', 9)).toEqual([3, 6]);
  });
  test('an empty list is a valid "none match" answer', () => {
    expect(parseGridAnswer('{"tiles":[]}', 9)).toEqual([]);
  });
  test('drops closed <think> blocks', () => {
    expect(parseGridAnswer('<think>{"tiles":[9]}</think>{"tiles":[2]}', 9)).toEqual([2]);
  });
  test('rejects out-of-range or non-integer tiles instead of clicking a guess', () => {
    expect(() => parseGridAnswer('{"tiles":[0,1]}', 9)).toThrow(AnswerError);
    expect(() => parseGridAnswer('{"tiles":[10]}', 9)).toThrow(AnswerError);
    expect(() => parseGridAnswer('{"tiles":[1.5]}', 9)).toThrow(AnswerError);
  });
  test('rejects replies without JSON', () => {
    expect(() => parseGridAnswer('tiles 1 and 4', 9)).toThrow(AnswerError);
  });
});

describe('grid helpers', () => {
  test('resolveGridSize: configured wins, else sqrt of a square tile count, else 3', () => {
    expect(resolveGridSize(4, 9)).toBe(4);
    expect(resolveGridSize(0, 16)).toBe(4);
    expect(resolveGridSize(0, 10)).toBe(3);
    expect(resolveGridSize(0, 0)).toBe(3);
  });
  test('prompt names the grid, numbering, task and JSON shape', () => {
    const p = buildGridPrompt(3, 'Select all images with buses', 'Ignore cars');
    expect(p).toContain('3x3');
    expect(p).toContain('9 is bottom-right');
    expect(p).toContain('Task: Select all images with buses');
    expect(p).toContain('{"tiles":[...]}');
    expect(p).toEndWith('Ignore cars');
  });
  test('pointIn stays in the middle of the rect', () => {
    const r = { left: 100, top: 50, width: 100, height: 100 };
    expect(pointIn(r, () => 0)).toEqual({ x: 130, y: 80 });
    expect(pointIn(r, () => 1)).toEqual({ x: 170, y: 120 });
  });
});

describe('grid rules', () => {
  test('a grid rule needs no answer box; text and math rules still do', () => {
    expect(v.safeParse(SiteRuleSchema, { kind: 'grid', captcha: 'img' }).success).toBe(true);
    const text = v.safeParse(SiteRuleSchema, { captcha: 'img' });
    expect(text.success).toBe(false);
    expect(text.issues?.[0]?.path?.[0]?.key).toBe('input');
  });
  test('old rules keep parsing, with grid fields defaulted', () => {
    const out = v.parse(SiteRuleSchema, { captcha: 'img', input: 'input' });
    expect(out).toMatchObject({ kind: 'text', tiles: '', instruction: '', gridSize: 0 });
  });
});
