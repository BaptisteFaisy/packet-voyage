/**
 * Concurrency limiter — at most `maxConcurrent` tasks in flight (task brief:
 * "at most 4 concurrent requests"). RIPEstat allows up to 8 simultaneous
 * queries (§6.1); we stay well under that. Simple queue, FIFO order.
 */

export const MAX_CONCURRENT_REQUESTS = 4;

export interface Limiter {
  run<T>(task: () => Promise<T>): Promise<T>;
  /** Number of tasks currently in flight. */
  readonly active: number;
  /** Peak number of tasks in flight since creation (for tests). */
  readonly peak: number;
}

export function createLimiter(maxConcurrent: number = MAX_CONCURRENT_REQUESTS): Limiter {
  const queue: Array<() => void> = [];
  let active = 0;
  let peak = 0;

  function release(): void {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  }

  return {
    get active() {
      return active;
    },
    get peak() {
      return peak;
    },
    run<T>(task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const start = () => {
          active += 1;
          if (active > peak) peak = active;
          task().then(
            (value) => {
              release();
              resolve(value);
            },
            (err: unknown) => {
              release();
              reject(err);
            },
          );
        };
        if (active < maxConcurrent) start();
        else queue.push(start);
      });
    },
  };
}
