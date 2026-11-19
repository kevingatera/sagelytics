import { and, count, eq, gte, lt, sql } from 'drizzle-orm';

import type { db } from '~/server/db';
import {
  billingSubscriptions,
  monitoringTasks,
  stripeEvents,
  usageEvents,
  users,
  type BillingSubscription,
} from '~/server/db/schema';

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

export type UsageKind = 'discovery';

export interface SubscriptionFields {
  stripeSubscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/** Persistence used by the billing service and webhook. Kept narrow so tests can fake it. */
export interface BillingStore {
  getSubscription(userId: string): Promise<BillingSubscription | null>;
  findByCustomerId(customerId: string): Promise<BillingSubscription | null>;
  userExists(userId: string): Promise<boolean>;
  /** Record the user's Stripe customer. Keeps an existing link. */
  linkCustomer(userId: string, customerId: string): Promise<void>;
  saveSubscription(userId: string, customerId: string, fields: SubscriptionFields): Promise<void>;
  countUsage(userId: string, kind: UsageKind, from: Date, to: Date): Promise<number>;
  insertUsage(userId: string, kind: UsageKind, ref: string | null): Promise<{ id: string }>;
  deleteUsage(userId: string, id: string): Promise<boolean>;
  countMonitoredProducts(userId: string): Promise<number>;
  isEventProcessed(eventId: string): Promise<boolean>;
  /** Run fn in a transaction that holds this user's billing lock until commit/rollback. */
  withUserLock<T>(userId: string, fn: (store: BillingStore) => Promise<T>): Promise<T>;
  /**
   * Run fn in a transaction that first records eventId. Returns false without running fn if the
   * event was already recorded. If fn throws, the record rolls back so Stripe's retry reprocesses.
   */
  runEventOnce(
    eventId: string,
    type: string,
    fn: (store: BillingStore) => Promise<void>,
  ): Promise<boolean>;
}

/**
 * Namespace for pg_advisory_xact_lock(int4, int4). The second key is hashtext(user_id). A hash
 * collision between two users only makes them wait for each other; it never lets a check pass.
 */
export const BILLING_LOCK_NAMESPACE = 0x5347_4231; // "SGB1"

export function userLockSql(userId: string) {
  return sql`select pg_advisory_xact_lock(${BILLING_LOCK_NAMESPACE}, hashtext(${userId}))`;
}

function createStore(database: Database, executor: Executor): BillingStore {
  const store: BillingStore = {
    async getSubscription(userId) {
      const [row] = await executor
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.userId, userId))
        .limit(1);
      return row ?? null;
    },

    async findByCustomerId(customerId) {
      const [row] = await executor
        .select()
        .from(billingSubscriptions)
        .where(eq(billingSubscriptions.stripeCustomerId, customerId))
        .limit(1);
      return row ?? null;
    },

    async userExists(userId) {
      const [row] = await executor
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return Boolean(row);
    },

    async linkCustomer(userId, customerId) {
      await executor
        .insert(billingSubscriptions)
        .values({ userId, stripeCustomerId: customerId })
        .onConflictDoNothing({ target: billingSubscriptions.userId });
    },

    async saveSubscription(userId, customerId, fields) {
      const now = new Date();
      await executor
        .insert(billingSubscriptions)
        .values({ userId, stripeCustomerId: customerId, ...fields, updatedAt: now })
        .onConflictDoUpdate({
          target: billingSubscriptions.userId,
          set: { stripeCustomerId: customerId, ...fields, updatedAt: now },
        });
    },

    async countUsage(userId, kind, from, to) {
      const [row] = await executor
        .select({ n: count() })
        .from(usageEvents)
        .where(
          and(
            eq(usageEvents.userId, userId),
            eq(usageEvents.kind, kind),
            gte(usageEvents.createdAt, from),
            lt(usageEvents.createdAt, to),
          ),
        );
      return row?.n ?? 0;
    },

    async insertUsage(userId, kind, ref) {
      const [row] = await executor
        .insert(usageEvents)
        .values({ userId, kind, ref })
        .returning({ id: usageEvents.id });
      if (!row) throw new Error('Failed to record usage');
      return row;
    },

    async deleteUsage(userId, id) {
      const rows = await executor
        .delete(usageEvents)
        .where(and(eq(usageEvents.id, id), eq(usageEvents.userId, userId)))
        .returning({ id: usageEvents.id });
      return rows.length > 0;
    },

    async countMonitoredProducts(userId) {
      const [row] = await executor
        .select({
          n: sql<number>`coalesce(sum(jsonb_array_length(${monitoringTasks.productUrls})), 0)::int`,
        })
        .from(monitoringTasks)
        .where(eq(monitoringTasks.userId, userId));
      return Number(row?.n ?? 0);
    },

    async isEventProcessed(eventId) {
      const [row] = await executor
        .select({ id: stripeEvents.id })
        .from(stripeEvents)
        .where(eq(stripeEvents.id, eventId))
        .limit(1);
      return Boolean(row);
    },

    async withUserLock(userId, fn) {
      return database.transaction(async (tx) => {
        await tx.execute(userLockSql(userId));
        return fn(createStore(database, tx));
      });
    },

    async runEventOnce(eventId, type, fn) {
      return database.transaction(async (tx) => {
        // A concurrent delivery of the same id blocks on the primary key until this commits,
        // then sees the conflict and returns no row.
        const inserted = await tx
          .insert(stripeEvents)
          .values({ id: eventId, type })
          .onConflictDoNothing({ target: stripeEvents.id })
          .returning({ id: stripeEvents.id });
        if (inserted.length === 0) return false;
        await fn(createStore(database, tx));
        return true;
      });
    },
  };
  return store;
}

export function createDrizzleBillingStore(database: Database): BillingStore {
  return createStore(database, database);
}
