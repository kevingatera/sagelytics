/** Shared by API routes and the browser, so it holds no server imports. */

export const BILLING_LIMIT_CODE = 'BILLING_LIMIT_REACHED';
export const BILLING_SETTINGS_PATH = '/settings?tab=billing';

export interface BillingLimitInfo {
  resource: 'discovery' | 'monitored_product';
  plan: string;
  limit: number;
  used: number;
  resetsAt: string | Date | null;
}

export function planLabel(plan: string): string {
  return plan === 'pro' ? 'Pro' : plan === 'free' ? 'Free' : plan;
}

/** Calendar date in UTC: free periods end at 00:00 UTC, which local time would show as the day before. */
export function formatBillingDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function billingLimitMessage(info: BillingLimitInfo): string {
  const plan = planLabel(info.plan);
  if (info.resource === 'discovery') {
    const reset = info.resetsAt ? ` Your allowance resets on ${formatBillingDate(info.resetsAt)}.` : '';
    return `You've used ${info.used} of ${info.limit} competitor discoveries included in the ${plan} plan.${reset}`;
  }
  return `The ${plan} plan includes ${info.limit} monitored products and ${info.used} are already in use.`;
}

/** Narrows a parsed 402 body (BillingLimitError.toJSON()) or progress payload. */
export function isBillingLimitPayload(value: unknown): value is BillingLimitInfo & { code: string } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.code === BILLING_LIMIT_CODE &&
    (v.resource === 'discovery' || v.resource === 'monitored_product') &&
    typeof v.plan === 'string' &&
    typeof v.limit === 'number' &&
    typeof v.used === 'number'
  );
}
