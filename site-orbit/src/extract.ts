import { array, number, object, safeParse, string } from 'valibot';
import type { RankPoint, SiteStats } from './types';

export type ExtractErrorCode = 'malformed-json' | 'schema-mismatch' | 'no-data';

export type ExtractResult = { ok: true; stats: SiteStats } | { ok: false; code: ExtractErrorCode };

const TrancoResponseSchema = object({
  ranks: array(
    object({
      date: string(),
      rank: number(),
    }),
  ),
  domain: string(),
});

export function extractTrancoStats(raw: unknown, domain: string): ExtractResult {
  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, code: 'malformed-json' };
    }
  } else {
    parsed = raw;
  }

  const result = safeParse(TrancoResponseSchema, parsed);
  if (!result.success) {
    return { ok: false, code: 'schema-mismatch' };
  }

  // Tranco returns newest-first, but sort defensively so momentum never inverts.
  const ranks: RankPoint[] = [...result.output.ranks].sort((a, b) => b.date.localeCompare(a.date));
  if (!ranks.length) {
    return { ok: false, code: 'no-data' };
  }

  const latestRank = ranks[0].rank;
  const oldestRank = ranks[ranks.length - 1].rank;
  // If rank was 31 and is now 29, change is +2 (improved)
  const rankChange = ranks.length > 1 ? oldestRank - latestRank : null;

  return {
    ok: true,
    stats: {
      domain,
      globalRank: latestRank,
      globalRankChange: rankChange,
      rankHistory: ranks,
      capturedAt: Date.now(),
    },
  };
}
