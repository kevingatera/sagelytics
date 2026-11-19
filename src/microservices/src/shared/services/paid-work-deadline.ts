const DEFAULT_DEADLINE_MS = 45_000;

export interface PaidWorkDeadline {
  deadlineAt: number;
  signal: AbortSignal;
}

export interface AnalysisBudget extends PaidWorkDeadline {
  hasModelCalls(): boolean;
  claimModelCall(this: void): void;
}

export function createAnalysisBudget(
  deadline: PaidWorkDeadline,
): AnalysisBudget {
  const configured = Number(process.env.ANALYSIS_MAX_LLM_CALLS ?? 3);
  let remaining =
    Number.isSafeInteger(configured) && configured > 0 ? configured : 3;

  return {
    ...deadline,
    hasModelCalls: () => remaining > 0,
    claimModelCall: () => {
      deadline.signal.throwIfAborted();
      if (Date.now() >= deadline.deadlineAt)
        throw new Error('Paid work deadline exceeded');
      if (remaining === 0) throw new Error('Analysis model call limit reached');
      remaining -= 1;
    },
  };
}

export async function runWithPaidDeadline<T>(
  requestedDeadline: number | undefined,
  work: (deadline: PaidWorkDeadline) => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const maxDeadline = now + DEFAULT_DEADLINE_MS;
  const deadlineAt = Number.isFinite(requestedDeadline)
    ? Math.min(requestedDeadline!, maxDeadline)
    : maxDeadline;
  const error = new Error('Paid work deadline exceeded');
  if (deadlineAt <= now) throw error;

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(error);
      reject(error);
    }, deadlineAt - now);
  });
  try {
    return await Promise.race([
      work({ deadlineAt, signal: controller.signal }),
      expired,
    ]);
  } finally {
    clearTimeout(timer);
    // Cancel queued retries or other remaining work if the handler finished early.
    controller.abort();
  }
}
