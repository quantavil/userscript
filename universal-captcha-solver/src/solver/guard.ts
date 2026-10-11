/**
 * Sliding-window circuit breaker for auto-solving.
 * Prevents a runaway loop (wrong answer -> site reloads captcha -> auto-solve -> repeat)
 * from burning API quota.
 */
export class RateGuard {
  private hits: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records an attempt; false means the breaker is open. */
  allow(): boolean {
    const t = this.now();
    this.hits = this.hits.filter((h) => t - h < this.windowMs);
    if (this.hits.length >= this.max) return false;
    this.hits.push(t);
    return true;
  }

  reset(): void {
    this.hits = [];
  }
}
