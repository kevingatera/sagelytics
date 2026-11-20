// Counts open progress streams per key (user id). Each process keeps its own
// counts, which bounds a single account on this server.
export function createStreamLimiter(maxPerKey: number) {
  const active = new Map<string, number>();

  return {
    // Returns a release function when a slot is free, or null when the key is at its limit.
    acquire(key: string): (() => void) | null {
      const current = active.get(key) ?? 0;
      if (current >= maxPerKey) return null;

      active.set(key, current + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const next = (active.get(key) ?? 1) - 1;
        if (next <= 0) {
          active.delete(key);
        } else {
          active.set(key, next);
        }
      };
    },
    activeCount(key: string): number {
      return active.get(key) ?? 0;
    },
  };
}
