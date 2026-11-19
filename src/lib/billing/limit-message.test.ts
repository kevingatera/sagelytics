import { describe, expect, it } from 'vitest';

import { BillingLimitError } from '~/server/billing/errors';

import { billingLimitMessage, formatBillingDate, isBillingLimitPayload } from './limit-message';

describe('billingLimitMessage', () => {
  it('describes a spent discovery allowance with its UTC reset date', () => {
    const error = new BillingLimitError({
      resource: 'discovery',
      plan: 'free',
      limit: 2,
      used: 2,
      resetsAt: new Date('2026-12-01T00:00:00Z'),
    });
    const payload: unknown = JSON.parse(JSON.stringify(error.toJSON()));

    expect(isBillingLimitPayload(payload)).toBe(true);
    if (!isBillingLimitPayload(payload)) return;
    expect(billingLimitMessage(payload)).toBe(
      "You've used 2 of 2 competitor discoveries included in the Free plan. Your allowance resets on December 1, 2026.",
    );
  });

  it('describes the monitored product cap without a reset date', () => {
    expect(
      billingLimitMessage({ resource: 'monitored_product', plan: 'pro', limit: 200, used: 199, resetsAt: null }),
    ).toBe('The Pro plan includes 200 monitored products and 199 are already in use.');
  });

  it('rejects payloads that are not billing limit errors', () => {
    expect(isBillingLimitPayload({ error: 'nope' })).toBe(false);
    expect(isBillingLimitPayload(null)).toBe(false);
  });

  it('formats dates in UTC', () => {
    expect(formatBillingDate('2026-12-01T00:00:00.000Z')).toBe('December 1, 2026');
  });
});
