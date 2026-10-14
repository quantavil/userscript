/**
 * Status text classification.
 *
 * Status strings are free-form and assembled in several places, so the patterns that decide
 * whether a status is routine, an error, or still working live here rather than being
 * re-implemented per consumer with slightly different results.
 */

export type StatusTone = 'error' | 'working' | 'ready' | 'idle';

/** Routine progress statuses that should not be written to the activity log. */
const ROUTINE_STATUS =
  /^(?:Bot disabled|Preparing Stockfish|Loading Stockfish|Analyzing|Pondering|Submitting move|Move confirmed|Waiting for opponent|Waiting for board|Ready ·|Resuming\.\.\.)/;

const ERROR_STATUS = /error|failed|unavailable|not confirmed|crashed/i;

const WORKING_STATUS = /loading|analyz|ponder|submitting|resuming/i;

export function isRoutineStatus(status?: string | null): boolean {
  if (!status) return true;
  return ROUTINE_STATUS.test(status);
}

export function isErrorStatus(status?: string | null): boolean {
  if (!status) return false;
  return ERROR_STATUS.test(status);
}

export function isWorkingStatus(status?: string | null): boolean {
  if (!status) return false;
  return WORKING_STATUS.test(status);
}

/** Statuses the panel renders as a setup problem worth calling out separately. */
export function setupProblem(status?: string | null): boolean {
  if (!status) return false;
  return /controller not captured|Enable synchronous/i.test(status);
}

export function getStatusTone(status: string | undefined | null, enabled: boolean): StatusTone {
  if (isErrorStatus(status)) return 'error';
  if (isWorkingStatus(status)) return 'working';
  return enabled ? 'ready' : 'idle';
}
