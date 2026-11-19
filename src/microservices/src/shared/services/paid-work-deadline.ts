const DEFAULT_DEADLINE_MS = 45_000;

export interface PaidWorkDeadline {
  deadlineAt: number;
  signal: AbortSignal;
}

export interface AnalysisBudget extends PaidWorkDeadline {
  hasModelCalls(): boolean;
  claimModelCall(this: void): void;
}

/** Counts the paid requests one run starts, and refuses new ones once its deadline passes. */
export interface PaidRun extends PaidWorkDeadline {
  readonly paidCallsStarted: number;
  /** Call right before dispatching a request that may cost money. Throws after the deadline. */
  claimPaidCall(this: void): void;
}

/** What a queued paid request needs from its run: the signal and the claim made at dispatch. */
export type PaidCallClaim = Pick<PaidRun, 'signal' | 'claimPaidCall'>;

export class PaidDeadlineExceededError extends Error {
  constructor() {
    super('Paid work deadline exceeded');
    this.name = 'PaidDeadlineExceededError';
  }
}

function assertBeforeDeadline(deadline: PaidWorkDeadline): void {
  deadline.signal.throwIfAborted();
  if (Date.now() >= deadline.deadlineAt) throw new PaidDeadlineExceededError();
}

export function createPaidRun(deadline: PaidWorkDeadline): PaidRun {
  let started = 0;
  return {
    ...deadline,
    get paidCallsStarted() {
      return started;
    },
    claimPaidCall: () => {
      assertBeforeDeadline(deadline);
      started += 1;
    },
  };
}

/** `onModelCall` runs for each claimed call, e.g. to count it against a whole discovery run. */
export function createAnalysisBudget(
  deadline: PaidWorkDeadline,
  onModelCall?: () => void,
): AnalysisBudget {
  const configured = Number(process.env.ANALYSIS_MAX_LLM_CALLS ?? 3);
  let remaining =
    Number.isSafeInteger(configured) && configured > 0 ? configured : 3;

  return {
    ...deadline,
    hasModelCalls: () => remaining > 0,
    claimModelCall: () => {
      assertBeforeDeadline(deadline);
      if (remaining === 0) throw new Error('Analysis model call limit reached');
      onModelCall?.();
      remaining -= 1;
    },
  };
}

/**
 * A slice of `run`: ends at `timeoutMs` from now or the run's deadline, whichever is first, and
 * counts each model call against the run.
 */
export function createRunSlice(
  run: PaidRun,
  timeoutMs: number,
): PaidWorkDeadline {
  return {
    signal: AbortSignal.any([run.signal, AbortSignal.timeout(timeoutMs)]),
    deadlineAt: Math.min(run.deadlineAt, Date.now() + timeoutMs),
  };
}

export function createRunAnalysisBudget(
  run: PaidRun,
  timeoutMs = DEFAULT_DEADLINE_MS,
): AnalysisBudget {
  return createAnalysisBudget(
    createRunSlice(run, timeoutMs),
    run.claimPaidCall,
  );
}

export type PaidDeadlineOptions = {
  /** Longest deadline accepted, measured from now. Defaults to 45 s. */
  maxMs?: number;
  /**
   * Time after the deadline that the work may use to return what it has. The signal still aborts
   * at the deadline; only the caller's hard stop moves. Defaults to 0.
   */
  settleMs?: number;
};

export async function runWithPaidDeadline<T>(
  requestedDeadline: number | undefined,
  work: (deadline: PaidWorkDeadline) => Promise<T>,
  options: PaidDeadlineOptions = {},
): Promise<T> {
  const now = Date.now();
  const maxDeadline = now + (options.maxMs ?? DEFAULT_DEADLINE_MS);
  const deadlineAt = Number.isFinite(requestedDeadline)
    ? Math.min(requestedDeadline!, maxDeadline)
    : maxDeadline;
  const error = new PaidDeadlineExceededError();
  if (deadlineAt <= now) throw error;

  const controller = new AbortController();
  let abortTimer: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  const settleMs = Math.max(0, options.settleMs ?? 0);
  const expired = new Promise<never>((_, reject) => {
    abortTimer = setTimeout(() => {
      controller.abort(error);
      if (settleMs === 0) reject(error);
    }, deadlineAt - now);
    if (settleMs > 0) {
      stopTimer = setTimeout(() => reject(error), deadlineAt - now + settleMs);
    }
  });
  try {
    return await Promise.race([
      work({ deadlineAt, signal: controller.signal }),
      expired,
    ]);
  } finally {
    clearTimeout(abortTimer);
    clearTimeout(stopTimer);
    // Cancel queued retries or other remaining work if the handler finished early.
    controller.abort();
  }
}
