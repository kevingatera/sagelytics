import type postgres from 'postgres';
import type Stripe from 'stripe';

import type { StripeClient } from './stripe';

// Type-only imports: scripts/maintenance/resync-paid-periods.mjs runs this file with plain Node.

export interface Period {
  start: Date;
  end: Date;
}

export function later(a: Period | null, b: Period | null): Period | null {
  if (!a) return b;
  if (!b) return a;
  return b.end.getTime() > a.end.getTime() ? b : a;
}

/**
 * The service period a paid invoice bought for this subscription: its non-proration subscription
 * lines. A proration-only invoice (a mid-cycle change) buys no new period and returns null.
 */
export function invoiceServicePeriod(
  invoice: Pick<Stripe.Invoice, 'lines'>,
  subscriptionId: string,
): Period | null {
  let best: Period | null = null;
  for (const line of invoice.lines?.data ?? []) {
    const details = line.parent?.subscription_item_details;
    if (line.parent?.type !== 'subscription_item_details' || !details || details.proration) {
      continue;
    }
    if (details.subscription && details.subscription !== subscriptionId) continue;
    best = later(best, {
      start: new Date(line.period.start * 1000),
      end: new Date(line.period.end * 1000),
    });
  }
  return best;
}

/** Re-read Stripe for the latest service period this subscription has paid for. */
export async function latestPaidPeriod(
  subscriptionId: string,
  stripe: Pick<StripeClient, 'invoices'>,
): Promise<Period | null> {
  const { data } = await stripe.invoices.list({
    subscription: subscriptionId,
    status: 'paid',
    limit: 5,
  });
  let best: Period | null = null;
  for (const invoice of data) best = later(best, invoiceServicePeriod(invoice, subscriptionId));
  return best;
}

/**
 * Statuses whose paid period may be missing after migration 0009, which only backfilled active
 * and trialing rows: their current period can be a renewal that was never paid.
 */
export const RESYNC_STATUSES = ['past_due', 'canceled', 'unpaid'] as const;

export interface ResyncCandidate {
  userId: string;
  stripeSubscriptionId: string;
  status: string;
}

export interface ResyncStore {
  /** Rows with a subscription, no paid period, and a status in RESYNC_STATUSES. */
  listCandidates(): Promise<ResyncCandidate[]>;
  /**
   * Write the paid period if the row still has none and still points at the same subscription
   * (a webhook may have filled it meanwhile). Returns false if it changed nothing.
   */
  savePaidPeriod(candidate: ResyncCandidate, period: Period): Promise<boolean>;
}

export type ResyncAction =
  | 'would_update'
  | 'updated'
  | 'changed_meanwhile'
  | 'no_paid_invoice'
  | 'error';

export interface ResyncResult extends ResyncCandidate {
  action: ResyncAction;
  period: Period | null;
  error?: string;
}

/**
 * Fill paid_period_* for rows the migration left empty, from the latest paid invoice in Stripe
 * (the same lookup the webhook uses). Dry run unless `apply`. A row with no paid invoice stays
 * empty, which resolves to the free plan.
 */
export async function resyncPaidPeriods(opts: {
  stripe: Pick<StripeClient, 'invoices'>;
  store: ResyncStore;
  apply: boolean;
}): Promise<ResyncResult[]> {
  const results: ResyncResult[] = [];
  for (const candidate of await opts.store.listCandidates()) {
    try {
      const period = await latestPaidPeriod(candidate.stripeSubscriptionId, opts.stripe);
      let action: ResyncAction = 'no_paid_invoice';
      if (period && !opts.apply) action = 'would_update';
      if (period && opts.apply) {
        action = (await opts.store.savePaidPeriod(candidate, period))
          ? 'updated'
          : 'changed_meanwhile';
      }
      results.push({ ...candidate, action, period });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ ...candidate, action: 'error', period: null, error: message });
    }
  }
  return results;
}

/**
 * ResyncStore over a postgres.js connection (the script has no Drizzle or Next.js runtime).
 * Timestamps go in as ISO strings: Drizzle replaces a shared connection's Date serializer.
 */
export function sqlResyncStore(sql: postgres.Sql): ResyncStore {
  return {
    async listCandidates() {
      const rows = await sql<{ user_id: string; stripe_subscription_id: string; status: string }[]>`
        select user_id, stripe_subscription_id, status
        from sg_billing_subscription
        where paid_period_end is null
          and stripe_subscription_id is not null
          and status in ${sql([...RESYNC_STATUSES])}
        order by user_id`;
      return rows.map((row) => ({
        userId: row.user_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        status: row.status,
      }));
    },
    async savePaidPeriod(candidate, period) {
      const rows = await sql`
        update sg_billing_subscription
        set paid_period_start = ${period.start.toISOString()}::timestamptz,
            paid_period_end = ${period.end.toISOString()}::timestamptz,
            updated_at = now()
        where user_id = ${candidate.userId}
          and stripe_subscription_id = ${candidate.stripeSubscriptionId}
          and paid_period_end is null
        returning user_id`;
      return rows.length > 0;
    },
  };
}
