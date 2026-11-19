import { describe, expect, it } from 'vitest';

import {
  resyncPaidPeriods,
  type Period,
  type ResyncCandidate,
  type ResyncStore,
} from './paid-period';
import { createFakeStripe, paidInvoice } from './testing/fake-stripe';

function memoryResyncStore(candidates: ResyncCandidate[]) {
  const saved = new Map<string, Period>();
  const store: ResyncStore = {
    async listCandidates() {
      return candidates.filter((row) => !saved.has(row.userId));
    },
    async savePaidPeriod(candidate, period) {
      if (saved.has(candidate.userId)) return false;
      saved.set(candidate.userId, period);
      return true;
    },
  };
  return { store, saved };
}

describe('resyncPaidPeriods', () => {
  const candidates: ResyncCandidate[] = [
    { userId: 'u-paid', stripeSubscriptionId: 'sub_paid', status: 'canceled' },
    { userId: 'u-unpaid', stripeSubscriptionId: 'sub_unpaid', status: 'past_due' },
  ];

  function stripeWithInvoices() {
    const stripe = createFakeStripe();
    stripe.setInvoice(
      paidInvoice({
        id: 'in_oct',
        subscription: 'sub_paid',
        periodStart: '2026-10-05T00:00:00Z',
        periodEnd: '2026-11-05T00:00:00Z',
      }),
    );
    // The renewal that opened the unpaid period: open, never paid, so it must not count.
    stripe.setInvoice(
      paidInvoice({
        id: 'in_nov',
        subscription: 'sub_paid',
        periodStart: '2026-11-05T00:00:00Z',
        periodEnd: '2026-12-05T00:00:00Z',
        status: 'open',
      }),
    );
    return stripe;
  }

  it('reports what it would write and writes nothing by default', async () => {
    const mem = memoryResyncStore(candidates);
    const results = await resyncPaidPeriods({
      stripe: stripeWithInvoices().client,
      store: mem.store,
      apply: false,
    });

    expect(results.map((row) => [row.userId, row.action, row.period?.end.toISOString()])).toEqual([
      ['u-paid', 'would_update', '2026-11-05T00:00:00.000Z'],
      ['u-unpaid', 'no_paid_invoice', undefined],
    ]);
    expect(mem.saved.size).toBe(0);
  });

  it('writes the latest paid period with apply, and is a no-op the second time', async () => {
    const mem = memoryResyncStore(candidates);
    const stripe = stripeWithInvoices();
    const results = await resyncPaidPeriods({
      stripe: stripe.client,
      store: mem.store,
      apply: true,
    });

    expect(results.map((row) => row.action)).toEqual(['updated', 'no_paid_invoice']);
    expect(mem.saved.get('u-paid')).toEqual({
      start: new Date('2026-10-05T00:00:00Z'),
      end: new Date('2026-11-05T00:00:00Z'),
    });

    const again = await resyncPaidPeriods({ stripe: stripe.client, store: mem.store, apply: true });
    expect(again.map((row) => row.action)).toEqual(['no_paid_invoice']);
  });

  it('reports a Stripe error per row and carries on', async () => {
    const mem = memoryResyncStore(candidates);
    const stripe = stripeWithInvoices();
    stripe.fake.invoices.list.mockRejectedValueOnce(new Error('timeout'));
    const results = await resyncPaidPeriods({
      stripe: stripe.client,
      store: mem.store,
      apply: true,
    });

    expect(results.map((row) => [row.action, row.error])).toEqual([
      ['error', 'timeout'],
      ['no_paid_invoice', undefined],
    ]);
  });
});
