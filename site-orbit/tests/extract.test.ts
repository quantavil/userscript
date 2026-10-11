import { describe, expect, test } from 'bun:test';
import { extractTrancoStats } from '../src/extract';

const SAMPLE_TRANCO = {
  ranks: [
    { date: '2026-08-31', rank: 29 },
    { date: '2026-08-30', rank: 30 },
    { date: '2026-08-01', rank: 31 },
  ],
  domain: 'github.com',
};

describe('extractTrancoStats', () => {
  test('extracts and normalizes valid Tranco API response', () => {
    const result = extractTrancoStats(JSON.stringify(SAMPLE_TRANCO), 'github.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.stats.domain).toBe('github.com');
    expect(result.stats.globalRank).toBe(29);
    // Went from rank 31 to 29 => +2 change
    expect(result.stats.globalRankChange).toBe(2);
    expect(result.stats.rankHistory).toHaveLength(3);
  });

  test('reports no-data when ranks array is empty', () => {
    const result = extractTrancoStats({ ranks: [], domain: 'unranked.xyz' }, 'unranked.xyz');
    expect(result).toEqual({ ok: false, code: 'no-data' });
  });

  test('reports malformed JSON and schema mismatches', () => {
    expect(extractTrancoStats('invalid-json', 'example.com')).toEqual({
      ok: false,
      code: 'malformed-json',
    });
    expect(extractTrancoStats({ invalid: 123 }, 'example.com')).toEqual({
      ok: false,
      code: 'schema-mismatch',
    });
  });
});
