import { detectTech } from './detect-tech';
import { fetchDnsInfo } from './dns';
import { domainFromUrl } from './domain';
import { extractTrancoStats } from './extract';
import { type HttpClient, HttpRequestError } from './gm';
import type { SiteRepository } from './store';
import { extractPerformanceMetrics, extractSiteMeta, faviconUrl } from './telemetry';
import type { CollectionState, SiteRecord, SiteStats } from './types';

const REQUEST_TIMEOUT_MS = 15_000;
const LOCK_TTL_MS = 30_000;
type Listener = (state: CollectionState) => void;

export class Collector {
  private readonly inFlight = new Map<string, Promise<SiteRecord>>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly states = new Map<string, CollectionState>();

  constructor(
    private readonly repository: SiteRepository,
    private readonly http: HttpClient,
    private readonly ownerFactory: () => string,
  ) {}

  subscribe(domain: string, listener: Listener): () => void {
    const domainListeners = this.listeners.get(domain) ?? new Set<Listener>();
    domainListeners.add(listener);
    this.listeners.set(domain, domainListeners);
    listener(this.states.get(domain) ?? { status: 'idle', record: null });
    return () => {
      domainListeners.delete(listener);
      if (domainListeners.size === 0) this.listeners.delete(domain);
    };
  }

  collect(domain: string, force = false): Promise<SiteRecord> {
    // A forced refresh must never be answered by an in-flight cache-respecting run.
    const existing = force ? undefined : this.inFlight.get(domain);
    if (existing) return existing;
    const request = this.run(domain, force).finally(() => this.inFlight.delete(domain));
    this.inFlight.set(domain, request);
    return request;
  }

  private async run(domain: string, force: boolean): Promise<SiteRecord> {
    const current = (await this.repository.get(domain)) ?? (await this.repository.touch(domain));
    if (!this.repository.needsCollection(current, force)) {
      this.emit(domain, { status: 'ready', record: current });
      return current;
    }

    this.emit(domain, { status: 'loading', record: current });
    const owner = this.ownerFactory();
    if (!(await this.repository.acquireLock(domain, owner, LOCK_TTL_MS))) {
      return await this.waitForWinner(domain, current);
    }

    try {
      const [trancoResult, dnsInfo] = await Promise.all([
        this.http.get(
          `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`,
          REQUEST_TIMEOUT_MS,
        ),
        fetchDnsInfo(domain, this.http).catch(() => null),
      ]);

      // Live DOM/timing probes are only valid for the page we are actually on.
      const isCurrentPage =
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        domainFromUrl(window.location.href) === domain;

      const live = {
        dns: dnsInfo,
        tech: isCurrentPage ? detectTech() : [],
        performance: isCurrentPage ? extractPerformanceMetrics() : null,
        ...(isCurrentPage ? extractSiteMeta(domain) : { description: null, faviconUrl: faviconUrl(domain) }),
      };

      const unranked = trancoResult.status === 404;
      const extracted = unranked ? null : extractTrancoStats(trancoResult.text, domain);

      if (!unranked && trancoResult.status !== 200) {
        return await this.fail(domain, `http-${trancoResult.status}`);
      }
      if (extracted && !extracted.ok && extracted.code !== 'no-data') {
        return await this.fail(domain, extracted.code);
      }

      // Unranked domains still carry useful tech/DNS/perf telemetry, so store it either way.
      const stats: SiteStats = extracted?.ok
        ? { ...extracted.stats, ...live }
        : {
            domain,
            globalRank: null,
            globalRankChange: null,
            rankHistory: [],
            capturedAt: Date.now(),
            ...live,
          };

      const record = extracted?.ok
        ? await this.repository.saveSuccess(domain, stats)
        : await this.repository.saveNoData(domain, stats);
      this.emit(domain, { status: 'ready', record });
      return record;
    } catch (error) {
      return await this.fail(domain, error instanceof HttpRequestError ? error.code : 'network-error');
    } finally {
      await this.repository.releaseLock(domain, owner);
    }
  }

  private async fail(domain: string, code: string): Promise<SiteRecord> {
    const record = await this.repository.saveFailure(domain, code);
    this.emit(domain, { status: 'error', record, code });
    return record;
  }

  private async waitForWinner(domain: string, baseline: SiteRecord): Promise<SiteRecord> {
    const signature = `${baseline.status}:${baseline.capturedAt}:${baseline.retryAfter}:${baseline.errorCode}`;
    let latest = baseline;
    for (let attempt = 0; attempt < 300; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      latest = (await this.repository.get(domain)) ?? latest;
      const latestSignature = `${latest.status}:${latest.capturedAt}:${latest.retryAfter}:${latest.errorCode}`;
      if (latestSignature !== signature || !(await this.repository.isLocked(domain))) break;
    }
    if (latest.status === 'error') {
      this.emit(domain, { status: 'error', record: latest, code: latest.errorCode ?? 'collection-failed' });
    } else {
      this.emit(domain, { status: 'ready', record: latest });
    }
    return latest;
  }

  private emit(domain: string, state: CollectionState): void {
    this.states.set(domain, state);
    for (const listener of this.listeners.get(domain) ?? []) listener(state);
  }
}
