import type { KeyValueStore } from './gm';
import type { SiteRecord, SiteStats } from './types';

export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
export const FAILURE_RETRY_MS = 6 * 60 * 60 * 1_000;
const RECORD_PREFIX = 'site-orbit:record:';
const LOCK_PREFIX = 'site-orbit:lock:';
const UPDATE_LOCK_PREFIX = 'site-orbit:update-lock:';

interface LockRecord {
  owner: string;
  expiresAt: number;
}

function recordKey(domain: string): string {
  return `${RECORD_PREFIX}${domain}`;
}

function lockKey(domain: string): string {
  return `${LOCK_PREFIX}${domain}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableNumber(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isSiteRecord(value: unknown, domain: string): value is SiteRecord {
  if (!isObject(value) || value.schemaVersion !== 1 || value.domain !== domain) return false;
  if (
    !isNullableNumber(value.firstVisitedAt) ||
    !isNullableNumber(value.lastVisitedAt) ||
    typeof value.visitCount !== 'number' ||
    !isNullableNumber(value.capturedAt) ||
    !isNullableNumber(value.expiresAt) ||
    !isNullableNumber(value.retryAfter) ||
    (value.errorCode !== null && typeof value.errorCode !== 'string') ||
    !['ready', 'no-data', 'error'].includes(String(value.status))
  ) {
    return false;
  }
  if (value.stats === null) return true;
  const stats = value.stats;
  if (!isObject(stats) || stats.domain !== domain) return false;
  return Array.isArray(stats.rankHistory);
}

export class SiteRepository {
  constructor(
    private readonly storage: KeyValueStore,
    private readonly now: () => number = Date.now,
  ) {}

  async touch(domain: string): Promise<SiteRecord> {
    return await this.mutate(domain, (current) => {
      const timestamp = this.now();
      return current
        ? { ...current, lastVisitedAt: timestamp, visitCount: current.visitCount + 1 }
        : this.emptyRecord(domain, timestamp);
    });
  }
  async get(domain: string): Promise<SiteRecord | null> {
    const value = await this.storage.get<unknown>(recordKey(domain), null);
    if (!isSiteRecord(value, domain)) {
      if (value !== null) await this.storage.delete(recordKey(domain));
      return null;
    }
    return value;
  }
  async saveSuccess(domain: string, stats: SiteStats): Promise<SiteRecord> {
    return await this.mutate(domain, (current) => {
      const timestamp = this.now();
      return {
        ...(current ?? this.emptyRecord(domain, timestamp)),
        capturedAt: timestamp,
        expiresAt: timestamp + CACHE_TTL_MS,
        status: 'ready',
        retryAfter: null,
        errorCode: null,
        stats,
      };
    });
  }
  async saveFailure(domain: string, code: string): Promise<SiteRecord> {
    return await this.mutate(domain, (current) => {
      const timestamp = this.now();
      return {
        ...(current ?? this.emptyRecord(domain, timestamp)),
        status: 'error',
        retryAfter: timestamp + FAILURE_RETRY_MS,
        errorCode: code,
      };
    });
  }
  /** Domain is outside the Tranco list; any non-rank telemetry we did gather is still kept. */
  async saveNoData(domain: string, stats: SiteStats | null = null): Promise<SiteRecord> {
    return await this.mutate(domain, (current) => {
      const timestamp = this.now();
      return {
        ...(current ?? this.emptyRecord(domain, timestamp)),
        capturedAt: timestamp,
        expiresAt: timestamp + CACHE_TTL_MS,
        status: 'no-data',
        retryAfter: null,
        errorCode: 'no-data',
        stats,
      };
    });
  }
  needsCollection(record: SiteRecord | null, force = false): boolean {
    if (force || !record) return true;
    const deadline = record.status === 'error' ? record.retryAfter : record.expiresAt;
    return !deadline || deadline <= this.now();
  }
  async acquireLock(domain: string, owner: string, ttl: number): Promise<boolean> {
    return await this.acquireStorageLock(lockKey(domain), owner, ttl);
  }
  async isLocked(domain: string): Promise<boolean> {
    const current = await this.storage.get<LockRecord | null>(lockKey(domain), null);
    return Boolean(current && current.expiresAt > this.now());
  }
  async releaseLock(domain: string, owner: string): Promise<void> {
    await this.releaseStorageLock(lockKey(domain), owner);
  }
  async list(): Promise<SiteRecord[]> {
    const domains = (await this.storage.keys())
      .filter((key) => key.startsWith(RECORD_PREFIX))
      .map((key) => key.slice(RECORD_PREFIX.length));
    const records = await Promise.all(domains.map((domain) => this.get(domain)));
    return records
      .filter((record): record is SiteRecord => record !== null)
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }
  async delete(domain: string): Promise<void> {
    await this.storage.delete(recordKey(domain));
  }
  async clear(): Promise<void> {
    const keys = await this.storage.keys();
    await Promise.all(
      keys
        .filter(
          (key) =>
            key.startsWith(RECORD_PREFIX) ||
            key.startsWith(LOCK_PREFIX) ||
            key.startsWith(UPDATE_LOCK_PREFIX),
        )
        .map((key) => this.storage.delete(key)),
    );
  }
  async exportJson(): Promise<string> {
    return JSON.stringify(await this.list(), null, 2);
  }

  private async acquireStorageLock(key: string, owner: string, ttl: number): Promise<boolean> {
    const current = await this.storage.get<LockRecord | null>(key, null);
    if (current && current.expiresAt > this.now() && current.owner !== owner) return false;
    await this.storage.set(key, { owner, expiresAt: this.now() + ttl } satisfies LockRecord);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const verified = await this.storage.get<LockRecord | null>(key, null);
    return verified?.owner === owner;
  }
  private async releaseStorageLock(key: string, owner: string): Promise<void> {
    const current = await this.storage.get<LockRecord | null>(key, null);
    if (current?.owner === owner) await this.storage.delete(key);
  }

  private async mutate(
    domain: string,
    update: (current: SiteRecord | null) => SiteRecord,
  ): Promise<SiteRecord> {
    const key = `${UPDATE_LOCK_PREFIX}${domain}`;
    const owner = `${this.now()}-${Math.random().toString(36).slice(2)}`;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await this.acquireStorageLock(key, owner, 2_000)) {
        try {
          const record = update(await this.get(domain));
          await this.write(record);
          return record;
        } finally {
          await this.releaseStorageLock(key, owner);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`record-lock-timeout:${domain}`);
  }

  private emptyRecord(domain: string, timestamp: number): SiteRecord {
    return {
      schemaVersion: 1,
      domain,
      firstVisitedAt: timestamp,
      lastVisitedAt: timestamp,
      visitCount: 1,
      capturedAt: null,
      expiresAt: null,
      status: 'error',
      retryAfter: null,
      errorCode: 'not-collected',
      stats: null,
    };
  }

  private async write(record: SiteRecord): Promise<void> {
    await this.storage.set(recordKey(record.domain), record);
  }
}
