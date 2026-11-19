import { eq, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('~/env', () => ({ env: {} }));

import * as schema from '~/server/db/schema';

import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { createBillingService } from './service';
import { CHECKOUT_IN_PROGRESS, createCheckoutSession } from './checkout';
import {
  BILLING_LOCK_NAMESPACE,
  createDrizzleBillingStore,
  tryUserLockSql,
  userLockSql,
} from './store';
import { BillingLockBusyError } from './errors';
import { resyncPaidPeriods, sqlResyncStore } from './paid-period';
import { createFakeStripe, event, paidInvoice, subscription } from './testing/fake-stripe';
import { DuplicateRefundPendingError, handleStripeEvent } from './webhook';

describe('userLockSql', () => {
  it('takes a transaction-scoped advisory lock keyed by namespace and user id', () => {
    const query = new PgDialect().sqlToQuery(userLockSql('user-alice'));
    expect(query.sql).toBe('select pg_advisory_xact_lock($1, hashtext($2))');
    expect(query.params).toEqual([BILLING_LOCK_NAMESPACE, 'user-alice']);
  });

  it('has a non-blocking variant on the same key', () => {
    const query = new PgDialect().sqlToQuery(tryUserLockSql('user-alice'));
    expect(query.sql).toBe('select pg_try_advisory_xact_lock($1, hashtext($2)) as locked');
    expect(query.params).toEqual([BILLING_LOCK_NAMESPACE, 'user-alice']);
  });
});

/**
 * Runs against a real, already-migrated Postgres (see docs/billing.md). Skipped unless
 * BILLING_TEST_DATABASE_URL is set, so CI and `pnpm test` never need a database.
 */
const url = process.env.BILLING_TEST_DATABASE_URL;

describe.skipIf(!url)('billing store against Postgres', () => {
  const conn = postgres(url ?? 'postgres://unused', { max: 12, onnotice: () => undefined });
  const database = drizzle(conn, { schema });
  const store = createDrizzleBillingStore(database);
  const userId = `billing-test-${crypto.randomUUID()}`;
  const raceUser = `billing-test-${crypto.randomUUID()}`;
  const clockUser = `billing-test-${crypto.randomUUID()}`;
  const monitorUser = `billing-test-${crypto.randomUUID()}`;
  const refundUser = `billing-test-${crypto.randomUUID()}`;
  const renewUser = `billing-test-${crypto.randomUUID()}`;
  const checkoutUser = `billing-test-${crypto.randomUUID()}`;
  const lockUser = `billing-test-${crypto.randomUUID()}`;
  const pendingRefundUser = `billing-test-${crypto.randomUUID()}`;
  const resyncUsers = Array.from({ length: 3 }, () => `billing-test-${crypto.randomUUID()}`);
  const allUsers = [
    userId,
    raceUser,
    clockUser,
    monitorUser,
    refundUser,
    renewUser,
    checkoutUser,
    lockUser,
    pendingRefundUser,
    ...resyncUsers,
  ];
  const config: BillingConfig = {
    enabled: true,
    webhookSecret: null,
    priceId: null,
    appUrl: null,
    limits: {
      free: { discoveriesPerPeriod: 3, monitoredProducts: 5 },
      pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
    },
  };
  const service = createBillingService({ store, config: () => config });
  const eventIds: string[] = [];

  beforeAll(async () => {
    await database
      .insert(schema.users)
      .values(allUsers.map((id) => ({ id, email: `${id}@example.test` })));
  });

  afterAll(async () => {
    for (const id of allUsers) {
      await database.delete(schema.usageEvents).where(eq(schema.usageEvents.userId, id));
      await database.delete(schema.monitoringTasks).where(eq(schema.monitoringTasks.userId, id));
      await database
        .delete(schema.billingSubscriptions)
        .where(eq(schema.billingSubscriptions.userId, id));
    }
    for (const id of eventIds)
      await database.delete(schema.stripeEvents).where(eq(schema.stripeEvents.id, id));
    for (const id of allUsers)
      await database
        .delete(schema.billingDuplicateRefunds)
        .where(eq(schema.billingDuplicateRefunds.userId, id));
    for (const id of allUsers) await database.delete(schema.users).where(eq(schema.users.id, id));
    await conn.end();
  });

  it('lets exactly `limit` of 10 concurrent reservations through', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => service.recordDiscoveryUsage(userId, `concurrent-${i}`)),
    );

    const passed = results.filter((r) => r.status === 'fulfilled');
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(passed).toHaveLength(3);
    expect(refused).toHaveLength(7);
    for (const r of refused) expect(r.reason).toBeInstanceOf(BillingLimitError);

    const usage = await service.getDiscoveryUsage(userId);
    expect(usage).toMatchObject({ used: 3, remaining: 0 });
  });

  it('frees a slot when a reservation is released', async () => {
    const rows = await database
      .select({ id: schema.usageEvents.id })
      .from(schema.usageEvents)
      .where(eq(schema.usageEvents.userId, userId))
      .limit(1);
    expect(await service.releaseDiscoveryUsage(userId, rows[0]!.id)).toBe(true);
    await expect(service.recordDiscoveryUsage(userId, 'after-release')).resolves.toMatchObject({
      usage: { used: 3, remaining: 0 },
    });
  });

  it('runs a webhook event once even when delivered concurrently', async () => {
    const eventId = `evt_test_${crypto.randomUUID()}`;
    eventIds.push(eventId);
    let runs = 0;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        store.runEventOnce(eventId, 'customer.subscription.updated', async () => {
          runs += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(runs).toBe(1);
  });

  it('rolls back the event id when the handler throws', async () => {
    const eventId = `evt_test_${crypto.randomUUID()}`;
    eventIds.push(eventId);
    await expect(
      store.runEventOnce(eventId, 'customer.subscription.updated', async (tx) => {
        await tx.linkCustomer(userId, `cus_${eventId}`);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await store.isEventProcessed(eventId)).toBe(false);
    expect(await store.getSubscription(userId)).toBeNull();
  });

  it('serialises events for one user and re-reads Stripe under the lock', async () => {
    const customerId = `cus_${raceUser}`;
    await store.linkCustomer(raceUser, customerId);
    const stripe = createFakeStripe();
    const active = subscription({ id: `sub_${raceUser}`, customer: customerId, status: 'active' });
    const canceled = subscription({
      id: `sub_${raceUser}`,
      customer: customerId,
      status: 'canceled',
      periodStart: '2026-10-05T00:00:00Z',
      periodEnd: '2026-11-05T00:00:00Z',
    });
    let stripeState = active;
    let releaseA!: () => void;
    const aGate = new Promise<void>((resolve) => (releaseA = resolve));
    const reads: string[] = [];
    stripe.fake.subscriptions.retrieve.mockImplementation(async () => {
      const snapshot = stripeState;
      reads.push(snapshot.status);
      if (reads.length === 1) await aGate;
      return snapshot;
    });
    const deps = { stripe: stripe.client, store, log: () => undefined };
    const ids = [`evt_a_${crypto.randomUUID()}`, `evt_b_${crypto.randomUUID()}`];
    eventIds.push(...ids);

    const a = handleStripeEvent(
      event(ids[0]!, 'customer.subscription.updated', { id: active.id, customer: customerId }),
      deps,
    );
    await vi.waitFor(() => expect(reads).toHaveLength(1));
    stripeState = canceled;
    const b = handleStripeEvent(
      event(ids[1]!, 'customer.subscription.deleted', { id: active.id, customer: customerId }),
      deps,
    );
    // B's transaction is parked on pg_advisory_xact_lock, so it has not read Stripe.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(reads).toHaveLength(1);

    releaseA();
    expect(await Promise.all([a, b])).toEqual(['processed', 'processed']);
    expect(reads).toEqual(['active', 'canceled']);
    expect(await store.getSubscription(raceUser)).toMatchObject({ status: 'canceled' });
  });

  it('round-trips the open checkout session and clears only the named one', async () => {
    const expiresAt = new Date('2026-11-18T12:31:00Z');
    await store.saveCheckoutSession(raceUser, { id: 'cs_pg_1', expiresAt, attempt: 4 });
    expect(await store.getSubscription(raceUser)).toMatchObject({
      checkoutSessionId: 'cs_pg_1',
      checkoutSessionExpiresAt: expiresAt,
      checkoutAttempt: 4,
    });
    await store.clearCheckoutSession(raceUser, 'cs_pg_other');
    expect((await store.getSubscription(raceUser))?.checkoutSessionId).toBe('cs_pg_1');
    await store.clearCheckoutSession(raceUser, 'cs_pg_1');
    expect(await store.getSubscription(raceUser)).toMatchObject({
      checkoutSessionId: null,
      checkoutSessionExpiresAt: null,
      checkoutAttempt: 4,
    });
  });

  it('stamps created_at with the instant used to pick the period, not the database clock', async () => {
    const instant = new Date('2026-11-30T23:59:59.990Z');
    const clockService = createBillingService({ store, config: () => config, now: () => instant });

    const { usageId, usage } = await clockService.recordDiscoveryUsage(clockUser, 'boundary');

    expect(usage.periodStart.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    const [row] = await database
      .select({ createdAt: schema.usageEvents.createdAt })
      .from(schema.usageEvents)
      .where(eq(schema.usageEvents.id, usageId));
    expect(row?.createdAt.toISOString()).toBe(instant.toISOString());
    expect(await store.countUsage(clockUser, 'discovery', usage.periodStart, usage.periodEnd)).toBe(
      1,
    );
  });

  it('reserves monitored products atomically with the task insert', async () => {
    const insertTask = (
      tx: Parameters<Parameters<typeof service.reserveMonitoredProducts>[2]>[0],
    ) =>
      tx.insert(schema.monitoringTasks).values({
        userId: monitorUser,
        competitorDomain: 'example.test',
        productUrls: [1, 2].map((n) => ({
          id: `${n}`,
          name: `p${n}`,
          url: `https://example.test/${n}`,
        })),
        frequency: '0 * * * *',
      });

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => service.reserveMonitoredProducts(monitorUser, 2, insertTask)),
    );

    // Free limit is 5 monitored products, 2 per task: exactly 2 tasks fit.
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    for (const r of results.filter((r): r is PromiseRejectedResult => r.status === 'rejected'))
      expect(r.reason).toBeInstanceOf(BillingLimitError);
    expect(await store.countMonitoredProducts(monitorUser)).toBe(4);
  });

  it('keeps a failed duplicate refund owed across the rollback-free retry and refunds once', async () => {
    const customerId = `cus_${refundUser}`;
    await store.linkCustomer(refundUser, customerId);
    const stripe = createFakeStripe();
    const keep = subscription({ id: `sub_keep_${refundUser}`, customer: customerId, created: 1 });
    stripe.setSubscription(keep);
    stripe.payPeriod(keep);
    const dupId = `sub_dup_${refundUser}`;
    stripe.setSubscription(
      subscription({ id: dupId, customer: customerId, created: 2, latestInvoice: `in_${dupId}` }),
    );
    stripe.setInvoice({
      id: `in_${dupId}`,
      status: 'paid',
      payments: {
        object: 'list',
        has_more: false,
        url: '',
        data: [{ status: 'paid', payment: { type: 'payment_intent', payment_intent: 'pi_d' } }],
      } as never,
    });
    stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
    const deps = { stripe: stripe.client, store, log: () => undefined, alert: () => undefined };
    const id = `evt_dup_${crypto.randomUUID()}`;
    eventIds.push(id);
    const dup = event(id, 'checkout.session.completed', {
      id: `cs_${refundUser}`,
      mode: 'subscription',
      client_reference_id: refundUser,
      customer: customerId,
      subscription: dupId,
    });

    await expect(handleStripeEvent(dup, deps)).rejects.toBeInstanceOf(DuplicateRefundPendingError);
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: 'stripe 500',
      sourceEventId: id,
    });
    expect(await store.isEventProcessed(id)).toBe(true);

    expect(await handleStripeEvent(dup, deps)).toBe('duplicate');
    expect(await handleStripeEvent(dup, deps)).toBe('duplicate');
    expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
    expect(stripe.fake.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'refunded',
      refundId: 're_1',
    });
    expect((await store.getSubscription(refundUser))?.stripeSubscriptionId).toBe(keep.id);
  });

  it('keeps the paid usage window through a failed renewal and advances it on a paid one', async () => {
    const customerId = `cus_${renewUser}`;
    await store.linkCustomer(renewUser, customerId);
    const stripe = createFakeStripe();
    const subId = `sub_${renewUser}`;
    const deps = { stripe: stripe.client, store, log: () => undefined };
    const october = subscription({
      id: subId,
      customer: customerId,
      periodStart: '2026-10-05T00:00:00Z',
      periodEnd: '2026-11-05T00:00:00Z',
    });
    stripe.setSubscription(october);
    stripe.payPeriod(october);
    const send = async (type: Parameters<typeof event>[1], object: object) => {
      const id = `evt_${crypto.randomUUID()}`;
      eventIds.push(id);
      return handleStripeEvent(event(id, type, object), deps);
    };
    await send('customer.subscription.created', { id: subId, customer: customerId });
    let now = new Date('2026-10-20T00:00:00Z');
    const renewService = createBillingService({ store, config: () => config, now: () => now });
    await renewService.recordDiscoveryUsage(renewUser, 'october');

    const renewal = paidInvoice({
      id: `in_renewal_${renewUser}`,
      subscription: subId,
      customer: customerId,
      periodStart: '2026-11-05T00:00:00Z',
      periodEnd: '2026-12-05T00:00:00Z',
    });
    stripe.setSubscription(
      subscription({
        id: subId,
        customer: customerId,
        status: 'past_due',
        periodStart: '2026-11-05T00:00:00Z',
        periodEnd: '2026-12-05T00:00:00Z',
      }),
    );
    await send('invoice.payment_failed', { ...renewal, status: 'open' });

    now = new Date('2026-11-06T00:00:00Z');
    const failed = await renewService.getDiscoveryUsage(renewUser);
    expect(failed).toMatchObject({ used: 1, limit: 50 });
    expect(failed.periodStart.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    now = new Date('2026-11-08T00:00:00Z');
    expect((await renewService.getPlanForUser(renewUser)).plan).toBe('free');

    stripe.setSubscription(
      subscription({
        id: subId,
        customer: customerId,
        status: 'active',
        periodStart: '2026-11-05T00:00:00Z',
        periodEnd: '2026-12-05T00:00:00Z',
      }),
    );
    await send('invoice.paid', renewal);
    const paid = await renewService.getDiscoveryUsage(renewUser);
    expect(paid).toMatchObject({ used: 0, limit: 50 });
    expect(paid.periodStart.toISOString()).toBe('2026-11-05T00:00:00.000Z');
    expect(await store.getSubscription(renewUser)).toMatchObject({
      paidPeriodEnd: new Date('2026-12-05T00:00:00Z'),
    });
  });

  it('answers a concurrent checkout fast with "in progress" instead of waiting on the lock', async () => {
    const stripe = createFakeStripe();
    let release!: () => void;
    const original = stripe.fake.customers.create.getMockImplementation()!;
    stripe.fake.customers.create.mockImplementationOnce(async (...args) => {
      await new Promise<void>((resolve) => (release = resolve));
      return { ...(await original(...args)), id: `cus_${checkoutUser}` };
    });
    const deps = {
      stripe: () => stripe.client,
      store,
      config: {
        ...config,
        priceId: 'price_test',
        webhookSecret: 'whsec',
        appUrl: 'https://a.test',
      },
    };
    const user = { id: checkoutUser, email: `${checkoutUser}@example.test` };
    const slow = createCheckoutSession(user, deps);
    await vi.waitFor(() => expect(stripe.fake.customers.create).toHaveBeenCalledTimes(1));

    const started = Date.now();
    const busy = await Promise.all(
      Array.from({ length: 4 }, () => createCheckoutSession(user, deps)),
    );
    expect(Date.now() - started).toBeLessThan(1000);
    for (const result of busy) {
      expect(result).toEqual({ ok: false, status: 409, error: CHECKOUT_IN_PROGRESS });
    }

    release();
    expect(await slow).toMatchObject({ ok: true });
    expect(await createCheckoutSession(user, deps)).toMatchObject({ ok: true });
    expect(stripe.fake.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it('gives up on a held user lock after maxWaitMs, records nothing, and resets lock_timeout', async () => {
    let release!: () => void;
    const held = store.withUserLock(lockUser, async () => {
      await new Promise<void>((resolve) => (release = resolve));
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const eventId = `evt_lock_${crypto.randomUUID()}`;
    eventIds.push(eventId);
    let ran = false;

    const started = Date.now();
    await expect(
      store.runEventOnce(
        eventId,
        'customer.subscription.updated',
        async () => {
          ran = true;
        },
        lockUser,
        { maxWaitMs: 200 },
      ),
    ).rejects.toBeInstanceOf(BillingLockBusyError);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(ran).toBe(false);
    expect(await store.isEventProcessed(eventId)).toBe(false);

    release();
    await held;
    // With the lock free it runs, and the rest of its transaction has the usual lock_timeout.
    const after = await store.withUserLock(
      lockUser,
      async (_locked, tx) => {
        const [row] = await tx.execute<{ lock_timeout: string }>(
          sql`select current_setting('lock_timeout') as lock_timeout`,
        );
        return row?.lock_timeout;
      },
      { maxWaitMs: 200 },
    );
    expect(after).toBe('0');
    expect(
      await store.runEventOnce(eventId, 'customer.subscription.updated', async () => {}, lockUser, {
        maxWaitMs: 200,
      }),
    ).toBe(true);
  });

  it('keeps a pending refund owed until it succeeds, replacing a failed one under a new key', async () => {
    const customerId = `cus_${pendingRefundUser}`;
    await store.linkCustomer(pendingRefundUser, customerId);
    const stripe = createFakeStripe();
    const keep = subscription({
      id: `sub_keep_${pendingRefundUser}`,
      customer: customerId,
      created: 1,
    });
    stripe.setSubscription(keep);
    stripe.payPeriod(keep);
    const dupId = `sub_dup_${pendingRefundUser}`;
    stripe.setSubscription(
      subscription({ id: dupId, customer: customerId, created: 2, latestInvoice: `in_${dupId}` }),
    );
    stripe.setInvoice({
      id: `in_${dupId}`,
      status: 'paid',
      payments: {
        object: 'list',
        has_more: false,
        url: '',
        data: [{ status: 'paid', payment: { type: 'payment_intent', payment_intent: 'pi_p' } }],
      } as never,
    });
    const deps = { stripe: stripe.client, store, log: () => undefined, alert: () => undefined };
    const send = async (type: Parameters<typeof event>[1], object: object) => {
      const id = `evt_${crypto.randomUUID()}`;
      eventIds.push(id);
      return handleStripeEvent(event(id, type, object), deps);
    };

    stripe.setNextRefundStatus('pending');
    await send('checkout.session.completed', {
      id: `cs_${pendingRefundUser}`,
      mode: 'subscription',
      client_reference_id: pendingRefundUser,
      customer: customerId,
      subscription: dupId,
    });
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'pending',
      refundId: 're_1',
    });

    stripe.setNextRefundStatus('pending');
    await send('refund.failed', stripe.setRefundStatus('re_1', 'failed', 'declined'));
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'pending',
      refundId: 're_2',
      attempts: 1,
    });
    expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey)).toEqual([
      `sagelytics-duplicate-refund-${dupId}`,
      `sagelytics-duplicate-refund-${dupId}-after-re_1`,
    ]);
    // Only the row's current refund matches; a stale id moves nothing.
    expect(await store.trackDuplicateRefund(dupId, 're_1', 're_x')).toBe(false);

    await send('refund.updated', stripe.setRefundStatus('re_2', 'succeeded'));
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'refunded',
      refundId: 're_2',
      attempts: 1,
    });
    expect(await store.resolveDuplicateRefund(dupId, 'refunded', 're_2')).toBe(false);
  });

  it('resyncs paid periods for rows the migration left empty, dry run first', async () => {
    const [canceledPaid, pastDueUnpaid, canceledSet] = resyncUsers as [string, string, string];
    const stripe = createFakeStripe();
    const october = {
      start: new Date('2026-10-05T00:00:00Z'),
      end: new Date('2026-11-05T00:00:00Z'),
    };
    const rows = [
      { userId: canceledPaid, status: 'canceled', paid: null },
      { userId: pastDueUnpaid, status: 'past_due', paid: null },
      { userId: canceledSet, status: 'canceled', paid: october },
    ];
    for (const row of rows) {
      await database.insert(schema.billingSubscriptions).values({
        userId: row.userId,
        stripeCustomerId: `cus_${row.userId}`,
        stripeSubscriptionId: `sub_${row.userId}`,
        status: row.status,
        currentPeriodStart: new Date('2026-11-05T00:00:00Z'),
        currentPeriodEnd: new Date('2026-12-05T00:00:00Z'),
        paidPeriodStart: row.paid?.start ?? null,
        paidPeriodEnd: row.paid?.end ?? null,
      });
    }
    stripe.setInvoice(
      paidInvoice({
        id: `in_${canceledPaid}`,
        subscription: `sub_${canceledPaid}`,
        periodStart: '2026-10-05T00:00:00Z',
        periodEnd: '2026-11-05T00:00:00Z',
      }),
    );
    const resyncStore = sqlResyncStore(conn);
    const ours = (results: Awaited<ReturnType<typeof resyncPaidPeriods>>) =>
      results
        .filter((row) => resyncUsers.includes(row.userId))
        .map((row) => [row.userId, row.action]);

    const dry = await resyncPaidPeriods({
      stripe: stripe.client,
      store: resyncStore,
      apply: false,
    });
    expect(ours(dry)).toEqual(
      expect.arrayContaining([
        [canceledPaid, 'would_update'],
        [pastDueUnpaid, 'no_paid_invoice'],
      ]),
    );
    expect(ours(dry)).toHaveLength(2);
    expect((await store.getSubscription(canceledPaid))?.paidPeriodEnd).toBeNull();

    const applied = await resyncPaidPeriods({
      stripe: stripe.client,
      store: resyncStore,
      apply: true,
    });
    expect(ours(applied)).toEqual(
      expect.arrayContaining([
        [canceledPaid, 'updated'],
        [pastDueUnpaid, 'no_paid_invoice'],
      ]),
    );
    expect(await store.getSubscription(canceledPaid)).toMatchObject({
      paidPeriodStart: october.start,
      paidPeriodEnd: october.end,
    });
    expect((await store.getSubscription(pastDueUnpaid))?.paidPeriodEnd).toBeNull();
    // A row that already had a paid period is never a candidate.
    expect(await store.getSubscription(canceledSet)).toMatchObject({ paidPeriodEnd: october.end });
    expect(
      await resyncStore.savePaidPeriod(
        { userId: canceledPaid, stripeSubscriptionId: `sub_${canceledPaid}`, status: 'canceled' },
        october,
      ),
    ).toBe(false);
  });
});
