import { describe, expect, test } from 'bun:test';
import { Collector } from '../src/collector';
import { type HttpClient, HttpRequestError, type HttpResponse, type KeyValueStore } from '../src/gm';
import { SiteRepository } from '../src/store';
import { makeStats } from './factories';

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, unknown>();
  async get<T>(key: string, fallback: T): Promise<T> {
    return (this.values.has(key) ? this.values.get(key) : fallback) as T;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.values.set(key, structuredClone(value));
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async keys(): Promise<string[]> {
    return [...this.values.keys()];
  }
}

class FakeHttp implements HttpClient {
  calls = 0;
  constructor(private readonly response: HttpResponse | Error) {}
  async get(): Promise<HttpResponse> {
    this.calls++;
    if (this.response instanceof Error) throw this.response;
    return this.response;
  }
}

function jsonFor(domain: string, rank = 29): string {
  return JSON.stringify({
    ranks: [
      { date: '2026-08-31', rank },
      { date: '2026-08-30', rank: rank + 1 },
    ],
    domain,
  });
}

describe('Collector', () => {
  test('skips a fresh cache and deduplicates concurrent stale requests', async () => {
    let now = 1_000;
    const repository = new SiteRepository(new MemoryStore(), () => now);
    await repository.touch('example.com');
    await repository.saveSuccess('example.com', makeStats());
    const http = new FakeHttp({ status: 200, text: jsonFor('example.com') });
    const collector = new Collector(repository, http, () => 'tab-a');

    expect((await collector.collect('example.com')).status).toBe('ready');
    expect(http.calls).toBe(0);

    now += 31 * 24 * 60 * 60 * 1_000;
    const first = collector.collect('example.com');
    const second = collector.collect('example.com');
    expect(first).toBe(second);
    await first;
    expect(http.calls).toBeGreaterThanOrEqual(1);
  });

  test('emits loading and ready states for a successful refresh', async () => {
    const repository = new SiteRepository(new MemoryStore(), () => 1_000);
    await repository.touch('example.com');
    const collector = new Collector(
      repository,
      new FakeHttp({ status: 200, text: jsonFor('example.com', 42) }),
      () => 'tab-a',
    );
    const statuses: string[] = [];
    collector.subscribe('example.com', (state) => statuses.push(state.status));

    const record = await collector.collect('example.com');
    expect(record.stats?.globalRank).toBe(42);
    expect(statuses).toEqual(['idle', 'loading', 'ready']);
  });

  test('a forced refresh is not answered by an in-flight cache-respecting request', async () => {
    const repository = new SiteRepository(new MemoryStore(), () => 1_000);
    await repository.touch('example.com');
    await repository.saveSuccess('example.com', makeStats());
    const http = new FakeHttp({ status: 200, text: jsonFor('example.com', 7) });
    const collector = new Collector(repository, http, () => 'tab-a');

    const cached = collector.collect('example.com');
    const forced = collector.collect('example.com', true);
    expect(forced).not.toBe(cached);
    expect((await forced).stats?.globalRank).toBe(7);
    expect(http.calls).toBeGreaterThanOrEqual(1);
  });

  test('keeps DNS telemetry for a domain that is unranked (404)', async () => {
    const repository = new SiteRepository(new MemoryStore(), () => 1_000);
    const http = new FakeHttp({ status: 404, text: '' });
    // Same fake answers Tranco (404) and DoH; DoH parsing yields nothing, so stats stay rank-less.
    const record = await new Collector(repository, http, () => 'tab-a').collect('unranked.example');
    expect(record.status).toBe('no-data');
    expect(record.stats?.globalRank).toBeNull();
    expect(record.stats?.faviconUrl).toContain('unranked.example');
  });

  test('records no-data for 404 or empty ranks and preserves stale values on failure', async () => {
    const noDataRepository = new SiteRepository(new MemoryStore(), () => 1_000);
    await noDataRepository.touch('missing.example');
    const noData = new Collector(noDataRepository, new FakeHttp({ status: 404, text: '' }), () => 'tab-a');
    expect((await noData.collect('missing.example')).status).toBe('no-data');

    let now = 1_000;
    const staleRepository = new SiteRepository(new MemoryStore(), () => now);
    await staleRepository.touch('example.com');
    await staleRepository.saveSuccess('example.com', makeStats('example.com', 100));
    now += 31 * 24 * 60 * 60 * 1_000;
    const failed = new Collector(staleRepository, new FakeHttp(new Error('timeout')), () => 'tab-a');
    const record = await failed.collect('example.com');
    expect(record.status).toBe('error');
    expect(record.stats?.globalRank).toBe(100);
    expect(record.errorCode).toBe('network-error');
  });

  test('keeps typed transport errors distinct', async () => {
    const timeoutRepository = new SiteRepository(new MemoryStore(), () => 1_000);
    await timeoutRepository.touch('timeout.example');
    const timeout = new Collector(
      timeoutRepository,
      new FakeHttp(new HttpRequestError('request-timeout')),
      () => 'tab-a',
    );
    expect((await timeout.collect('timeout.example')).errorCode).toBe('request-timeout');
  });

  test('a tab that loses the collection lock waits for the winner record', async () => {
    const storage = new MemoryStore();
    const firstRepository = new SiteRepository(storage, () => 1_000);
    const secondRepository = new SiteRepository(storage, () => 1_000);
    await firstRepository.touch('example.com');

    let releaseRequest: ((response: HttpResponse) => void) | undefined;
    let requestStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    const deferredHttp: HttpClient = {
      get: (url: string) => {
        if (!url.includes('tranco-list.eu')) {
          return Promise.resolve({ status: 404, text: '' });
        }
        return new Promise<HttpResponse>((resolve) => {
          releaseRequest = resolve;
          requestStarted?.();
        });
      },
    };
    const winner = new Collector(firstRepository, deferredHttp, () => 'tab-a');
    const loser = new Collector(secondRepository, new FakeHttp(new Error('must not request')), () => 'tab-b');

    const winnerResult = winner.collect('example.com');
    await started;
    const loserResult = loser.collect('example.com');
    await new Promise((resolve) => setTimeout(resolve, 0));
    releaseRequest?.({ status: 200, text: jsonFor('example.com', 29) });

    expect((await winnerResult).status).toBe('ready');
    expect((await loserResult).status).toBe('ready');
    expect((await loserResult).stats?.globalRank).toBe(29);
  });
});
