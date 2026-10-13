import { canonicalFen } from '../chess/position.js';
import type { MoveRequest, SiteAdapter } from '../sites/types.js';

export type MoveConfirmation =
  | { status: 'confirmed'; source: 'site-accepted' }
  | { status: 'locally-applied'; source: 'controller-local' }
  | { status: 'failed' };

/** Observe a move at its requested ply without strengthening the adapter's provenance. */
export function confirmSiteMove(request: MoveRequest, adapter: SiteAdapter, timeout = 1000): Promise<MoveConfirmation> {
  const expectedFen = canonicalFen(request.expectedFen, request.variant);
  if (
    request.signal.aborted ||
    !expectedFen ||
    (request.expectedPly !== null && (!Number.isInteger(request.expectedPly) || request.expectedPly < 0))
  )
    return Promise.resolve({ status: 'failed' });

  return new Promise((resolve) => {
    let done = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: MoveConfirmation) => {
      if (done) return;
      done = true;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {
          /* Observation cleanup must not prevent settlement. */
        }
        unsubscribe = undefined;
      }
      if (timer !== undefined) clearTimeout(timer);
      request.signal.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const check = () => {
      if (done) return;
      try {
        const current = adapter.read();
        if (current.kind !== 'game') return;
        const snapshot = current.snapshot;
        if (snapshot.identity !== request.identity) {
          finish({ status: 'failed' });
          return;
        }
        const source = snapshot.confirmationSource;
        if (source !== 'controller-local' && source !== 'site-accepted') {
          finish({ status: 'failed' });
          return;
        }
        const observed = request.expectedPly === null ? snapshot.fen : snapshot.confirmedFens?.[request.expectedPly];
        if (typeof observed !== 'string') return;
        if (canonicalFen(observed, request.variant) !== expectedFen) {
          if (request.expectedPly !== null) finish({ status: 'failed' });
          return;
        }
        finish(source === 'site-accepted' ? { status: 'confirmed', source } : { status: 'locally-applied', source });
      } catch {
        finish({ status: 'failed' });
      }
    };
    const onAbort = () => {
      // A site update can synchronously cancel stale search work before its listener runs.
      // Retain an already observed expected slot, with its original provenance.
      check();
      finish({ status: 'failed' });
    };

    request.signal.addEventListener('abort', onAbort, { once: true });
    try {
      const stop = adapter.subscribe(check);
      if (done) {
        try {
          stop();
        } catch {
          /* Handle synchronous subscription notifications. */
        }
      } else unsubscribe = stop;
    } catch {
      finish({ status: 'failed' });
    }
    if (done) return;
    timer = setTimeout(() => finish({ status: 'failed' }), Math.max(0, timeout));
    check();
    if (request.signal.aborted && !done) onAbort();
  });
}
