import { describe, expect, test } from 'bun:test';
import type { KeyValueStore } from '../src/gm';
import { CACHE_TTL_MS, FAILURE_RETRY_MS, SiteRepository } from '../src/store';
import { makeStats } from './factories';

class MemoryStore implements KeyValueStore {
  readonly values = new Map<string, unknown>();

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

describe('SiteRepository', () => {
  test('tracks visits and stores independent 30-day records', async () => {
    let now = 1_000;
    const repository = new SiteRepository(new MemoryStore(), () => now);
    await repository.touch('example.com');
    now += 10;
    await repository.touch('example.com');
    await repository.saveSuccess('example.com', makeStats());

    const record = await repository.get('example.com');
    expect(record?.visitCount).toBe(2);
    expect(record?.capturedAt).toBe(now);
    expect(record?.expiresAt).toBe(now + CACHE_TTL_MS);
    expect(repository.needsCollection(record)).toBe(false);

    now += CACHE_TTL_MS + 1;
    expect(repository.needsCollection(await repository.get('example.com'))).toBe(true);
  });

  test('serializes concurrent visit updates across repository instances', async () => {
    const storage = new MemoryStore();
    const first = new SiteRepository(storage, () => 1_000);
    const second = new SiteRepository(storage, () => 1_001);
    await Promise.all([first.touch('example.com'), second.touch('example.com')]);
    expect((await first.get('example.com'))?.visitCount).toBe(2);
  });

  test('uses a short retry cooldown and preserves stale stats after failure', async () => {
    let now = 5_000;
    const repository = new SiteRepository(new MemoryStore(), () => now);
    await repository.touch('example.com');
    await repository.saveSuccess('example.com', makeStats());
    now += CACHE_TTL_MS + 1;
    await repository.saveFailure('example.com', 'http-403');

    const failed = await repository.get('example.com');
    expect(failed?.status).toBe('error');
    expect(failed?.stats?.globalRank).toBe(100);
    expect(failed?.retryAfter).toBe(now + FAILURE_RETRY_MS);
    expect(repository.needsCollection(failed)).toBe(false);

    now += FAILURE_RETRY_MS + 1;
    expect(repository.needsCollection(await repository.get('example.com'))).toBe(true);
  });

  test('retries a failed forced refresh after cooldown even when the prior cache was unexpired', async () => {
    let now = 5_000;
    const repository = new SiteRepository(new MemoryStore(), () => now);
    await repository.touch('example.com');
    await repository.saveSuccess('example.com', makeStats());
    await repository.saveFailure('example.com', 'http-429');

    now += FAILURE_RETRY_MS + 1;
    expect(repository.needsCollection(await repository.get('example.com'))).toBe(true);
  });

  test('removes malformed persisted records', async () => {
    const storage = new MemoryStore();
    storage.values.set('site-orbit:record:example.com', {
      schemaVersion: 1,
      domain: 'example.com',
      visitCount: 'broken',
    });
    const repository = new SiteRepository(storage, () => 1_000);
    expect(await repository.get('example.com')).toBeNull();
    expect(storage.values.has('site-orbit:record:example.com')).toBe(false);
  });

  test('provides expiring per-domain locks', async () => {
    let now = 10_000;
    const repository = new SiteRepository(new MemoryStore(), () => now);
    expect(await repository.acquireLock('example.com', 'tab-a', 1_000)).toBe(true);
    expect(await repository.acquireLock('example.com', 'tab-b', 1_000)).toBe(false);
    now += 1_001;
    expect(await repository.acquireLock('example.com', 'tab-b', 1_000)).toBe(true);
    await repository.releaseLock('example.com', 'tab-a');
    expect(await repository.acquireLock('example.com', 'tab-c', 1_000)).toBe(false);
    await repository.releaseLock('example.com', 'tab-b');
    expect(await repository.acquireLock('example.com', 'tab-c', 1_000)).toBe(true);
  });

  test('lists, deletes, clears, and exports records deterministically', async () => {
    const repository = new SiteRepository(new MemoryStore(), () => 1_000);
    await repository.touch('z.example');
    await repository.touch('a.example');
    await repository.saveSuccess('z.example', makeStats('z.example', 2));
    await repository.saveSuccess('a.example', makeStats('a.example', 1));

    expect((await repository.list()).map((record) => record.domain)).toEqual(['a.example', 'z.example']);
    expect(
      JSON.parse(await repository.exportJson()).map((record: { domain: string }) => record.domain),
    ).toEqual(['a.example', 'z.example']);
    await repository.delete('a.example');
    expect((await repository.list()).map((record) => record.domain)).toEqual(['z.example']);
    await repository.clear();
    expect(await repository.list()).toEqual([]);
  });
});
