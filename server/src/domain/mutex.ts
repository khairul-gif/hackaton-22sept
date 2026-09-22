/**
 * Minimal async mutex serializing access to a critical section.
 *
 * The in-memory repository's find-then-assign is synchronous, so Node's
 * single-threaded event loop already makes it atomic today. This mutex
 * exists so that guarantee holds even if the repository is later swapped
 * for one with real `await` points (e.g. a database), at which point two
 * concurrent allocations could otherwise interleave and race for the same
 * locker.
 */
export class Mutex {
  private locked = false;
  private readonly queue: Array<() => void> = [];

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
