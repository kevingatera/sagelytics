import type { PlanName } from './plans';

export type MeteredResource = 'discovery' | 'monitored_product';

/** Thrown when a user is out of allowance. Routes should map it to HTTP 402 via toJSON(). */
export class BillingLimitError extends Error {
  readonly code = 'BILLING_LIMIT_REACHED';
  readonly resource: MeteredResource;
  readonly plan: PlanName;
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  /** When the allowance refills. Null for limits that are not periodic (monitored products). */
  readonly resetsAt: Date | null;

  constructor(opts: {
    resource: MeteredResource;
    plan: PlanName;
    limit: number;
    used: number;
    resetsAt: Date | null;
  }) {
    const what = opts.resource === 'discovery' ? 'competitor discoveries' : 'monitored products';
    const when = opts.resetsAt ? ` Resets ${opts.resetsAt.toISOString()}.` : '';
    super(`The ${opts.plan} plan includes ${opts.limit} ${what}; ${opts.used} used.${when}`);
    this.name = 'BillingLimitError';
    this.resource = opts.resource;
    this.plan = opts.plan;
    this.limit = opts.limit;
    this.used = opts.used;
    this.remaining = Math.max(0, opts.limit - opts.used);
    this.resetsAt = opts.resetsAt;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      resource: this.resource,
      plan: this.plan,
      limit: this.limit,
      used: this.used,
      remaining: this.remaining,
      resetsAt: this.resetsAt?.toISOString() ?? null,
    };
  }
}

export function isBillingLimitError(error: unknown): error is BillingLimitError {
  return error instanceof BillingLimitError;
}
