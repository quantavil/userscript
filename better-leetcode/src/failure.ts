import type { FailRecord } from './types';

/** Matches the poll endpoint used after Submit: /submissions/detail/<id>/check/ */
export const CHECK_RE = /\/submissions\/detail\/\d+\/check\/?(?:\?|$)/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: the point is to strip ESC-prefixed ANSI colour codes
const ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;

const text = (v: unknown): string => {
  if (Array.isArray(v)) return v.map(text).join('\n');
  return v == null ? '' : String(v).replace(ANSI_RE, '');
};

export type CheckResult = { kind: 'fail'; record: FailRecord } | { kind: 'accepted' } | null;

/**
 * Interpret one poll response. Returns null while the judge is still running or when the
 * response carries nothing useful (e.g. an internal error without input or message).
 */
export function parseCheck(slug: string, data: unknown, now = Date.now()): CheckResult {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.state !== 'SUCCESS') return null;

  const status = text(d.status_msg).trim();
  if (!status) return null;
  if (status === 'Accepted') return { kind: 'accepted' };

  const input = text(d.last_testcase);
  const error = text(d.full_compile_error || d.full_runtime_error || d.compile_error || d.runtime_error);
  // Compile errors have no test input, so accept either.
  if (!input && !error) return null;

  const correct = d.total_correct;
  const total = d.total_testcases;
  return {
    kind: 'fail',
    record: {
      slug,
      status,
      input,
      expected: text(d.expected_output),
      output: text(d.code_output),
      stdout: text(d.std_output),
      error,
      passed: typeof correct === 'number' && typeof total === 'number' ? `${correct} / ${total}` : '',
      time: now,
    },
  };
}
