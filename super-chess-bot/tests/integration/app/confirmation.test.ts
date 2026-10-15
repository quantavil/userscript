import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { confirmSiteMove } from '../../../src/game/confirmation.js';
import type { GameSnapshot, MoveRequest, SiteAdapter } from '../../../src/sites/types.js';

const ROOT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('move observation provenance', () => {
  it.each([
    ['controller-local', { status: 'locally-applied', source: 'controller-local' }],
    ['site-accepted', { status: 'confirmed', source: 'site-accepted' }],
  ] as const)('distinguishes %s history at the exact requested ply', async (source, expected) => {
    const fixture = makeFixture(source);
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4, confirmedFens: [ROOT, E4] });
    await expect(pending).resolves.toEqual(expected);
    expect(fixture.listeners.size).toBe(0);
  });

  it('fails unknown provenance rather than treating it as accepted', async () => {
    const fixture = makeFixture();
    fixture.update({ fen: E4, confirmedFens: [ROOT, E4] });
    await expect(confirmSiteMove(fixture.request, fixture.adapter)).resolves.toEqual({
      status: 'failed',
    });
  });

  it('does not confirm a changed current FEN without the expected indexed history', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4 });
    fixture.update({ fen: ROOT, confirmedFens: [ROOT] });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual({ status: 'failed' });
    expect(fixture.listeners.size).toBe(0);
  });

  it('keeps local provenance after a fast opponent response', async () => {
    const fixture = makeFixture('controller-local');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4_E5, confirmedFens: [ROOT, E4, E4_E5] });
    await expect(pending).resolves.toEqual({
      status: 'locally-applied',
      source: 'controller-local',
    });
  });

  it('finds an accepted bot ply after an immediate opponent response', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4_E5, confirmedFens: [ROOT, E4, E4_E5] });
    await expect(pending).resolves.toEqual({ status: 'confirmed', source: 'site-accepted' });
  });

  it('rejects a mismatching expected ply instead of matching another history slot', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4, confirmedFens: [ROOT, ROOT, E4] });
    await expect(pending).resolves.toEqual({ status: 'failed' });
  });

  it('fails a replacement game even if its history contains the target', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ identity: {}, fen: E4, confirmedFens: [ROOT, E4] });
    await expect(pending).resolves.toEqual({ status: 'failed' });
  });

  it('does not subscribe or read after an already canceled request', async () => {
    const fixture = makeFixture('site-accepted');
    fixture.controller.abort();
    const read = vi.spyOn(fixture.adapter, 'read');
    const subscribe = vi.spyOn(fixture.adapter, 'subscribe');
    await expect(confirmSiteMove(fixture.request, fixture.adapter)).resolves.toEqual({
      status: 'failed',
    });
    expect(read).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('cleans up when cancellation follows subscription', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.controller.abort();
    await expect(pending).resolves.toEqual({ status: 'failed' });
    expect(fixture.listeners.size).toBe(0);
  });

  it('retains an already observed accepted slot when cancellation precedes notification', async () => {
    const fixture = makeFixture('site-accepted');
    const pending = confirmSiteMove(fixture.request, fixture.adapter);
    fixture.update({ fen: E4, confirmedFens: [ROOT, E4] }, false);
    fixture.controller.abort();
    await expect(pending).resolves.toEqual({ status: 'confirmed', source: 'site-accepted' });
    expect(fixture.listeners.size).toBe(0);
  });

  it('releases a subscription that notifies synchronously during setup', async () => {
    const fixture = makeFixture('controller-local');
    fixture.update({ fen: E4, confirmedFens: [ROOT, E4] });
    fixture.adapter.subscribe = (listener) => {
      fixture.listeners.add(listener);
      listener();
      return () => {
        fixture.listeners.delete(listener);
      };
    };
    await expect(confirmSiteMove(fixture.request, fixture.adapter)).resolves.toEqual({
      status: 'locally-applied',
      source: 'controller-local',
    });
    expect(fixture.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles safely and releases observation when a controller getter throws', async () => {
    const fixture = makeFixture('controller-local');
    fixture.adapter.read = () => {
      throw new Error('Controller unavailable');
    };
    await expect(confirmSiteMove(fixture.request, fixture.adapter)).resolves.toEqual({
      status: 'failed',
    });
    expect(fixture.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('supports explicit current-position fallback without upgrading local provenance', async () => {
    const fixture = makeFixture('controller-local');
    fixture.request.expectedPly = null;
    fixture.update({ fen: E4, confirmedFens: undefined });
    await expect(confirmSiteMove(fixture.request, fixture.adapter)).resolves.toEqual({
      status: 'locally-applied',
      source: 'controller-local',
    });
  });
});

function makeFixture(source?: GameSnapshot['confirmationSource']) {
  const identity = {};
  let snapshot: GameSnapshot = {
    identity,
    gameId: 'test-game',
    board: {} as HTMLElement,
    fen: ROOT,
    playerColor: 'w',
    sideToMove: 'w',
    orientation: 'white',
    phase: 'live',
    inputReady: true,
    remainingMs: null,
    confirmedFens: [ROOT],
    ...(source ? { confirmationSource: source } : {}),
  };
  const listeners = new Set<() => void>();
  const adapter: SiteAdapter = {
    id: 'chesscom',
    read: () => ({ kind: 'game', snapshot }),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async submitMove() {
      return true;
    },
    cancelInput() {},
  };
  const controller = new AbortController();
  const request: MoveRequest = {
    identity,
    fromFen: ROOT,
    uci: 'e2e4',
    expectedFen: E4,
    expectedPly: 1,
    signal: controller.signal,
    isCurrent: () => true,
  };
  return {
    adapter,
    request,
    controller,
    listeners,
    update(next: Partial<GameSnapshot>, notify = true) {
      snapshot = { ...snapshot, ...next };
      if (notify) for (const listener of [...listeners]) listener();
    },
  };
}
