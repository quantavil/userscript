import { describe, expect, it } from 'vite-plus/test';
import { parseClockText } from '../../../src/sites/chesscom/snapshot.js';

describe('parseClockText', () => {
  it('parses clock with hours, minutes, and seconds into milliseconds', () => {
    expect(parseClockText('1:05:23')).toBe(3923000);
  });

  it('parses standard minutes and seconds into milliseconds', () => {
    expect(parseClockText('5:23')).toBe(323000);
  });

  it('parses plain seconds into milliseconds', () => {
    expect(parseClockText('42.25')).toBe(42250);
  });

  it('rejects malformed clock values', () => {
    expect(parseClockText('1:60:00')).toBeNull();
    expect(parseClockText('0:60.0')).toBeNull();
    expect(parseClockText('')).toBeNull();
    expect(parseClockText(null)).toBeNull();
  });
});
