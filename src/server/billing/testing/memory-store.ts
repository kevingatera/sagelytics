import type { BillingSubscription } from '~/server/db/schema';

import type { BillingStore, BillingTransaction, SubscriptionFields, UsageKind } from '../store';

interface UsageRow {
  id: string;
  userId: string;
  kind: UsageKind;
  ref: string | null;
  createdAt: Date;
}

/**
 * In-memory BillingStore for tests. withUserLock is a real per-user mutex; runEventOnce drops the
 * event id again if fn throws (other writes are not rolled back). The transaction handed to
 * withUserLock callbacks is `opts.tx` or an empty stub.
 */
export function createMemoryBillingStore(
  opts: { now?: () => Date; users?: string[]; tx?: BillingTransaction } = {},
) {
  const tx = opts.tx ?? ({} as BillingTransaction);
  const now = opts.now ?? (() => new Date());
  const users = new Set(opts.users ?? []);
  const subscriptions = new Map<string, BillingSubscription>();
  const usage: UsageRow[] = [];
  const events = new Map<string, string>();
  const monitoredProducts = new Map<string, number>();
  const locks = new Map<string, Promise<unknown>>();
  let nextId = 1;

  const store: BillingStore = {
    async getSubscription(userId) {
      return subscriptions.get(userId) ?? null;
    },
    async findByCustomerId(customerId) {
      return [...subscriptions.values()].find((row) => row.stripeCustomerId === customerId) ?? null;
    },
    async userExists(userId) {
      return users.has(userId);
    },
    async linkCustomer(userId, customerId) {
      if (subscriptions.has(userId)) return;
      if ([...subscriptions.values()].some((row) => row.stripeCustomerId === customerId)) {
        throw new Error('duplicate stripe_customer_id');
      }
      subscriptions.set(userId, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        status: null,
        priceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        checkoutSessionId: null,
        checkoutSessionExpiresAt: null,
        checkoutAttempt: 0,
        createdAt: now(),
        updatedAt: now(),
      });
    },
    async saveSubscription(userId, customerId, fields: SubscriptionFields) {
      const existing = subscriptions.get(userId);
      subscriptions.set(userId, {
        userId,
        stripeCustomerId: customerId,
        checkoutSessionId: existing?.checkoutSessionId ?? null,
        checkoutSessionExpiresAt: existing?.checkoutSessionExpiresAt ?? null,
        checkoutAttempt: existing?.checkoutAttempt ?? 0,
        createdAt: existing?.createdAt ?? now(),
        ...fields,
        updatedAt: now(),
      });
    },
    async saveCheckoutSession(userId, session) {
      const existing = subscriptions.get(userId);
      if (!existing) return;
      subscriptions.set(userId, {
        ...existing,
        checkoutSessionId: session.id,
        checkoutSessionExpiresAt: session.expiresAt,
        checkoutAttempt: session.attempt,
        updatedAt: now(),
      });
    },
    async clearCheckoutSession(userId, sessionId) {
      const existing = subscriptions.get(userId);
      if (existing?.checkoutSessionId !== sessionId) return;
      subscriptions.set(userId, {
        ...existing,
        checkoutSessionId: null,
        checkoutSessionExpiresAt: null,
        updatedAt: now(),
      });
    },
    async countUsage(userId, kind, from, to) {
      return usage.filter(
        (row) =>
          row.userId === userId &&
          row.kind === kind &&
          row.createdAt.getTime() >= from.getTime() &&
          row.createdAt.getTime() < to.getTime(),
      ).length;
    },
    async insertUsage(userId, kind, ref, createdAt) {
      const id = `usage-${nextId++}`;
      usage.push({ id, userId, kind, ref, createdAt: createdAt ?? now() });
      return { id };
    },
    async deleteUsage(userId, id) {
      const index = usage.findIndex((row) => row.id === id && row.userId === userId);
      if (index < 0) return false;
      usage.splice(index, 1);
      return true;
    },
    async countMonitoredProducts(userId) {
      return monitoredProducts.get(userId) ?? 0;
    },
    async isEventProcessed(eventId) {
      return events.has(eventId);
    },
    async withUserLock(userId, fn) {
      const previous = locks.get(userId) ?? Promise.resolve();
      const run = previous.then(() => fn(store, tx));
      locks.set(
        userId,
        run.catch(() => undefined),
      );
      return run;
    },
    async runEventOnce(eventId, type, fn) {
      if (events.has(eventId)) return false;
      events.set(eventId, type);
      try {
        await fn(store);
      } catch (error) {
        events.delete(eventId);
        throw error;
      }
      return true;
    },
  };

  return {
    store,
    subscriptions,
    usage,
    events,
    users,
    addUsage: (userId: string, createdAt: Date, kind: UsageKind = 'discovery') => {
      usage.push({ id: `usage-${nextId++}`, userId, kind, ref: null, createdAt });
    },
    setMonitoredProducts: (userId: string, n: number) => {
      monitoredProducts.set(userId, n);
    },
  };
}
