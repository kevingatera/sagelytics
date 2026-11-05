/** Raised when a discovery budget or a per-call deadline stops work. */
export class DeadlineExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeadlineExceededError';
  }
}

/**
 * An absolute deadline backed by an AbortSignal. A child inherits its parent's expiry and abort,
 * so one discovery budget bounds every provider call, retry and loop beneath it.
 */
export class Deadline {
  readonly expiresAt: number;
  private readonly controller = new AbortController();
  private readonly parent?: Deadline;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly onParentAbort = (): void => {
    this.abort(this.parent?.signal.reason);
  };

  private constructor(
    private readonly label: string,
    expiresAt: number,
    parent?: Deadline,
  ) {
    this.parent = parent;
    this.expiresAt = parent ? Math.min(expiresAt, parent.expiresAt) : expiresAt;

    if (parent) {
      if (parent.signal.aborted) {
        this.abort(parent.signal.reason);
        return;
      }
      parent.signal.addEventListener('abort', this.onParentAbort, { once: true });
    }

    this.timer = setTimeout(
      () => this.abort(new DeadlineExceededError(`${this.label} exceeded its deadline`)),
      Math.max(0, this.expiresAt - Date.now()),
    );
  }

  static root(label: string, ms: number): Deadline {
    return new Deadline(label, Date.now() + ms);
  }

  child(label: string, ms: number): Deadline {
    return new Deadline(label, Date.now() + ms, this);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get expired(): boolean {
    return this.controller.signal.aborted || this.remainingMs() <= 0;
  }

  remainingMs(): number {
    return Math.max(0, this.expiresAt - Date.now());
  }

  /** Rejects as soon as this deadline fires. It never resolves otherwise. */
  expiry(): Promise<never> {
    return new Promise<never>((_, reject) => {
      const fail = (): void => reject(this.controller.signal.reason as Error);
      if (this.controller.signal.aborted) {
        fail();
        return;
      }
      this.controller.signal.addEventListener('abort', fail, { once: true });
    });
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.parent?.signal.removeEventListener('abort', this.onParentAbort);
  }

  private abort(reason: unknown): void {
    if (this.controller.signal.aborted) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.controller.abort(reason);
  }
}

/**
 * Runs one provider call under a child deadline. The caller stops waiting at the deadline even if
 * the provider ignores the signal, and a call that starts after the budget is spent never dispatches.
 */
export async function runWithDeadline<T>(
  parent: Deadline,
  timeoutMs: number,
  label: string,
  task: (scope: Deadline) => Promise<T>,
): Promise<T> {
  if (parent.expired) {
    throw new DeadlineExceededError(`${label} skipped: discovery budget exhausted`);
  }
  const scope = parent.child(label, timeoutMs);
  try {
    return await Promise.race([task(scope), scope.expiry()]);
  } finally {
    scope.dispose();
  }
}
