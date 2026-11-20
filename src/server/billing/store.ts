import { and, count, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';

import type { db } from '~/server/db';
import {
  billingDuplicateRefunds,
  billingSubscriptions,
  monitoringTasks,
  stripeEvents,
  usageEvents,
  users,
  type BillingDuplicateRefund,
  type BillingSubscription,
} from '~/server/db/schema';

import { BillingLockBusyError } from './errors';

type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Executor = Database | Transaction;

/** The Drizzle transaction a locked callback runs in. Write through it to stay under the lock. */
export type BillingTransaction = Transaction;

export type UsageKind = 'discovery';

export interface SubscriptionFields {
  stripeSubscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /** Service period of the latest paid invoice (or the trial); null if nothing was paid. */
  paidPeriodStart: Date | null;
  paidPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSessionRecord {
  id: string;
  expiresAt: Date;
  /** The attempt number used in the Stripe idempotency key for this session. */
  attempt: number;
}

/**
 * `pending` means still owed, including while a Stripe refund is in flight (refund_id set).
 * `needs_attention` is still owed, but webhooks stopped refunding it: a person has to pay the
 * customer back. It still closes as `refunded` once Stripe shows the payment fully refunded.
 */
export type DuplicateRefundStatus =
  | 'pending'
  | 'needs_attention'
  | 'refunded'
  | 'voided'
  | 'nothing_to_refund';

/** Rows whose refund is still owed. */
export const OPEN_DUPLICATE_REFUND_STATUSES = ['pending', 'needs_attention'] as const;

export interface DuplicateRefundRecord {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId: string;
  keptSubscriptionId: string | null;
  /** The event that found the duplicate. It is not acknowledged until the refund is settled. */
  sourceEventId: string | null;
  /**
   * The duplicate's checkout invoice: the checkout session's invoice, else the subscription's
   * `subscription_create` invoice. Null if neither was found; the row then goes to a person.
   */
  invoiceId: string | null;
}

export interface UserLockOptions {
  /**
   * Don't queue: throw BillingLockBusyError at once if another transaction holds the lock. For
   * user-facing requests that would otherwise hold a pool connection while they wait.
   */
  noWait?: boolean;
  /**
   * Wait at most this long for the lock (Postgres lock_timeout), then throw BillingLockBusyError.
   * Unset waits as long as it takes, which is right for usage reservations.
   */
  maxWaitMs?: number;
}

/** Persistence used by the billing service and webhook. Kept narrow so tests can fake it. */
export interface BillingStore {
  getSubscription(userId: string): Promise<BillingSubscription | null>;
  findByCustomerId(customerId: string): Promise<BillingSubscription | null>;
  userExists(userId: string): Promise<boolean>;
  /** Record the user's Stripe customer. Keeps an existing link. */
  linkCustomer(userId: string, customerId: string): Promise<void>;
  saveSubscription(userId: string, customerId: string, fields: SubscriptionFields): Promise<void>;
  /** Remember the user's open Checkout Session. Requires a linked customer row. */
  saveCheckoutSession(userId: string, session: CheckoutSessionRecord): Promise<void>;
  /** Forget the open Checkout Session, only if it is still the one named. */
  clearCheckoutSession(userId: string, sessionId: string): Promise<void>;
  countUsage(userId: string, kind: UsageKind, from: Date, to: Date): Promise<number>;
  /** Insert a ledger row. Pass createdAt so the row lands in the period the caller checked. */
  insertUsage(
    userId: string,
    kind: UsageKind,
    ref: string | null,
    createdAt?: Date,
  ): Promise<{ id: string }>;
  deleteUsage(userId: string, id: string): Promise<boolean>;
  countMonitoredProducts(userId: string): Promise<number>;
  isEventProcessed(eventId: string): Promise<boolean>;
  /**
   * Ledger of duplicate subscriptions to cancel and refund. The webhook records a duplicate in the
   * event transaction and cancels/refunds it only after that commits, so the obligation is durable
   * before Stripe is touched. Recording an existing subscription keeps the existing row.
   */
  recordDuplicateRefund(record: DuplicateRefundRecord): Promise<void>;
  getDuplicateRefund(subscriptionId: string): Promise<BillingDuplicateRefund | null>;
  /**
   * Rows still owed (`pending` or `needs_attention`), oldest first: the customer's, or every
   * customer's when `customerId` is omitted (the maintenance sweep).
   */
  listOpenDuplicateRefunds(customerId?: string): Promise<BillingDuplicateRefund[]>;
  /** Close a row still owed. Returns false if it was already closed. */
  resolveDuplicateRefund(
    subscriptionId: string,
    status: Exclude<DuplicateRefundStatus, (typeof OPEN_DUPLICATE_REFUND_STATUSES)[number]>,
    refundId: string | null,
  ): Promise<boolean>;
  /**
   * Count a refund before it is asked for: set `attempts` to `attempt` on a pending row that still
   * has `expected` attempts. Compare-and-set, so of concurrent settlers one reserves the attempt.
   * Done before refunds.create, so a refund Stripe made whose response was lost is still counted.
   */
  reserveDuplicateRefundAttempt(
    subscriptionId: string,
    expected: number,
    attempt: number,
  ): Promise<boolean>;
  /**
   * Point a pending row at the Stripe refund now owed on, if it still points at `expected` (the
   * refund it was replaced from, or null). Compare-and-set, so concurrent settlers move it once.
   * `attempts` never goes down: it becomes the larger of the stored count and `update.attempts`.
   * `update.failure` (why the replaced refund failed) is stored as `last_error`.
   */
  trackDuplicateRefund(
    subscriptionId: string,
    expected: string | null,
    refundId: string,
    update: { attempts: number; failure?: string | null },
  ): Promise<boolean>;
  /**
   * Hand a pending row to a person: `needs_attention`, `refund_id` set to the refund that failed,
   * `attempts` to at least `update.attempts`, `failure` as `last_error`. Compare-and-set on the
   * refund the row pointed at (`expected`) and on its attempt count (`update.expectedAttempts`).
   * Returns the updated row, or null if another settler moved the row first.
   */
  flagDuplicateRefund(
    subscriptionId: string,
    expected: string | null,
    failure: string,
    update: { refundId: string | null; attempts: number; expectedAttempts: number },
  ): Promise<BillingDuplicateRefund | null>;
  /**
   * Note a Stripe API error on a pending row. `attempts` stays: the attempt was counted when it
   * was reserved, and its retry reuses the same idempotency key.
   */
  recordDuplicateRefundError(subscriptionId: string, error: string): Promise<void>;
  /**
   * Run fn in a transaction that holds this user's billing lock until commit/rollback. fn gets a
   * store bound to that transaction and the raw transaction for writes outside billing tables.
   */
  withUserLock<T>(
    userId: string,
    fn: (store: BillingStore, tx: BillingTransaction) => Promise<T>,
    options?: UserLockOptions,
  ): Promise<T>;
  /**
   * Run fn in a transaction that first records eventId. Returns false without running fn if the
   * event was already recorded. If fn throws, the record rolls back so Stripe's retry reprocesses.
   * With lockUserId, the transaction takes that user's billing lock before anything else, so
   * events for one user (and checkout) apply one at a time.
   */
  runEventOnce(
    eventId: string,
    type: string,
    fn: (store: BillingStore) => Promise<void>,
    lockUserId?: string | null,
    lockOptions?: UserLockOptions,
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

export function tryUserLockSql(userId: string) {
  return sql`select pg_try_advisory_xact_lock(${BILLING_LOCK_NAMESPACE}, hashtext(${userId})) as locked`;
}

/** Postgres lock_not_available: lock_timeout expired while waiting. */
const LOCK_NOT_AVAILABLE = '55P03';

function isLockTimeout(error: unknown): boolean {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | null;
  return e?.code === LOCK_NOT_AVAILABLE || e?.cause?.code === LOCK_NOT_AVAILABLE;
}

/** Take the user's lock inside tx, honoring noWait / maxWaitMs. */
async function acquireUserLock(tx: Transaction, userId: string, options?: UserLockOptions) {
  if (options?.noWait) {
    const [row] = await tx.execute<{ locked: boolean }>(tryUserLockSql(userId));
    if (!row?.locked) throw new BillingLockBusyError();
    return;
  }
  if (options?.maxWaitMs === undefined) {
    await tx.execute(userLockSql(userId));
    return;
  }
  const [setting] = await tx.execute<{ previous: string }>(
    sql`select current_setting('lock_timeout') as previous`,
  );
  const wait = `${Math.max(1, Math.round(options.maxWaitMs))}ms`;
  await tx.execute(sql`select set_config('lock_timeout', ${wait}, true)`);
  try {
    await tx.execute(userLockSql(userId));
  } catch (error) {
    if (isLockTimeout(error)) throw new BillingLockBusyError();
    throw error;
  }
  // Only the wait for this lock is bounded; the rest of the transaction keeps the usual setting.
  await tx.execute(sql`select set_config('lock_timeout', ${setting?.previous ?? '0'}, true)`);
}

function refundIs(expected: string | null) {
  return expected === null
    ? isNull(billingDuplicateRefunds.refundId)
    : eq(billingDuplicateRefunds.refundId, expected);
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

    async saveCheckoutSession(userId, session) {
      await executor
        .update(billingSubscriptions)
        .set({
          checkoutSessionId: session.id,
          checkoutSessionExpiresAt: session.expiresAt,
          checkoutAttempt: session.attempt,
          updatedAt: new Date(),
        })
        .where(eq(billingSubscriptions.userId, userId));
    },

    async clearCheckoutSession(userId, sessionId) {
      await executor
        .update(billingSubscriptions)
        .set({ checkoutSessionId: null, checkoutSessionExpiresAt: null, updatedAt: new Date() })
        .where(
          and(
            eq(billingSubscriptions.userId, userId),
            eq(billingSubscriptions.checkoutSessionId, sessionId),
          ),
        );
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

    async insertUsage(userId, kind, ref, createdAt) {
      const [row] = await executor
        .insert(usageEvents)
        .values({ userId, kind, ref, ...(createdAt ? { createdAt } : {}) })
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

    async recordDuplicateRefund(record) {
      await executor
        .insert(billingDuplicateRefunds)
        .values(record)
        .onConflictDoNothing({ target: billingDuplicateRefunds.stripeSubscriptionId });
    },

    async getDuplicateRefund(subscriptionId) {
      const [row] = await executor
        .select()
        .from(billingDuplicateRefunds)
        .where(eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId))
        .limit(1);
      return row ?? null;
    },

    async listOpenDuplicateRefunds(customerId) {
      return executor
        .select()
        .from(billingDuplicateRefunds)
        .where(
          and(
            customerId === undefined
              ? undefined
              : eq(billingDuplicateRefunds.stripeCustomerId, customerId),
            inArray(billingDuplicateRefunds.status, [...OPEN_DUPLICATE_REFUND_STATUSES]),
          ),
        )
        .orderBy(billingDuplicateRefunds.createdAt);
    },

    async resolveDuplicateRefund(subscriptionId, status, refundId) {
      const now = new Date();
      const rows = await executor
        .update(billingDuplicateRefunds)
        .set({ status, refundId, lastError: null, updatedAt: now, resolvedAt: now })
        .where(
          and(
            eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId),
            inArray(billingDuplicateRefunds.status, [...OPEN_DUPLICATE_REFUND_STATUSES]),
          ),
        )
        .returning({ id: billingDuplicateRefunds.stripeSubscriptionId });
      return rows.length > 0;
    },

    async reserveDuplicateRefundAttempt(subscriptionId, expected, attempt) {
      const rows = await executor
        .update(billingDuplicateRefunds)
        .set({ attempts: attempt, updatedAt: new Date() })
        .where(
          and(
            eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId),
            eq(billingDuplicateRefunds.status, 'pending'),
            eq(billingDuplicateRefunds.attempts, expected),
          ),
        )
        .returning({ id: billingDuplicateRefunds.stripeSubscriptionId });
      return rows.length > 0;
    },

    async trackDuplicateRefund(subscriptionId, expected, refundId, update) {
      const rows = await executor
        .update(billingDuplicateRefunds)
        .set({
          refundId,
          attempts: sql`greatest(${billingDuplicateRefunds.attempts}, ${update.attempts})`,
          updatedAt: new Date(),
          ...(update.failure && { lastError: update.failure.slice(0, 2000) }),
        })
        .where(
          and(
            eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId),
            eq(billingDuplicateRefunds.status, 'pending'),
            refundIs(expected),
          ),
        )
        .returning({ id: billingDuplicateRefunds.stripeSubscriptionId });
      return rows.length > 0;
    },

    async flagDuplicateRefund(subscriptionId, expected, failure, update) {
      const [row] = await executor
        .update(billingDuplicateRefunds)
        .set({
          status: 'needs_attention',
          refundId: update.refundId,
          attempts: sql`greatest(${billingDuplicateRefunds.attempts}, ${update.attempts})`,
          lastError: failure.slice(0, 2000),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId),
            eq(billingDuplicateRefunds.status, 'pending'),
            refundIs(expected),
            eq(billingDuplicateRefunds.attempts, update.expectedAttempts),
          ),
        )
        .returning();
      return row ?? null;
    },

    async recordDuplicateRefundError(subscriptionId, error) {
      await executor
        .update(billingDuplicateRefunds)
        .set({ lastError: error.slice(0, 2000), updatedAt: new Date() })
        .where(
          and(
            eq(billingDuplicateRefunds.stripeSubscriptionId, subscriptionId),
            eq(billingDuplicateRefunds.status, 'pending'),
          ),
        );
    },

    async withUserLock(userId, fn, options) {
      return database.transaction(async (tx) => {
        await acquireUserLock(tx, userId, options);
        return fn(createStore(database, tx), tx);
      });
    },

    async runEventOnce(eventId, type, fn, lockUserId, lockOptions) {
      return database.transaction(async (tx) => {
        if (lockUserId) await acquireUserLock(tx, lockUserId, lockOptions);
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
