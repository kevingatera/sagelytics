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
import {
  DUPLICATE_REFUND_MANUAL_LOG,
  DuplicateRefundPendingError,
  MAX_DUPLICATE_REFUND_ATTEMPTS,
  handleStripeEvent,
  settleOpenDuplicateRefunds,
} from './webhook';

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
  const cappedUser = `billing-test-${crypto.randomUUID()}`;
  const permanentUser = `billing-test-${crypto.randomUUID()}`;
  const raceRefundUser = `billing-test-${crypto.randomUUID()}`;
  const raceCapUser = `billing-test-${crypto.randomUUID()}`;
  const lostPermanentUser = `billing-test-${crypto.randomUUID()}`;
  const lostCapUser = `billing-test-${crypto.randomUUID()}`;
  const crashUser = `billing-test-${crypto.randomUUID()}`;
  const raceAttemptUser = `billing-test-${crypto.randomUUID()}`;
  const ownerRaceErrorUser = `billing-test-${crypto.randomUUID()}`;
  const ownerRaceOkUser = `billing-test-${crypto.randomUUID()}`;
  const sweepUser = `billing-test-${crypto.randomUUID()}`;
  const resyncUsers = Array.from({ length: 3 }, () => `billing-test-${crypto.randomUUID()}`);
  const allUsers = [
    cappedUser,
    permanentUser,
    raceRefundUser,
    raceCapUser,
    lostPermanentUser,
    lostCapUser,
    crashUser,
    raceAttemptUser,
    ownerRaceErrorUser,
    ownerRaceOkUser,
    sweepUser,
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
      // The attempt was counted before Stripe was called; the retry reuses its key.
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
      attempts: 2,
    });
    expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey)).toEqual([
      `sagelytics-duplicate-refund-${dupId}`,
      `sagelytics-duplicate-refund-${dupId}-attempt-2`,
    ]);
    // Only the row's current refund matches; a stale id moves nothing.
    expect(await store.trackDuplicateRefund(dupId, 're_1', 're_x', { attempts: 0 })).toBe(false);

    await send('refund.updated', stripe.setRefundStatus('re_2', 'succeeded'));
    expect(await store.getDuplicateRefund(dupId)).toMatchObject({
      status: 'refunded',
      refundId: 're_2',
      attempts: 2,
    });
    expect(await store.resolveDuplicateRefund(dupId, 'refunded', 're_2')).toBe(false);
  });

  describe('duplicate refunds that keep failing', () => {
    /**
     * A duplicate for `user` whose first refund Stripe leaves pending, ready to be failed. With
     * `lose`, Stripe makes that refund but the response never arrives, so the row has no refund id.
     */
    async function setUp(user: string, { lose = false } = {}) {
      const customerId = `cus_${user}`;
      await store.linkCustomer(user, customerId);
      const stripe = createFakeStripe();
      const keep = subscription({ id: `sub_keep_${user}`, customer: customerId, created: 1 });
      stripe.setSubscription(keep);
      stripe.payPeriod(keep);
      const dupId = `sub_dup_${user}`;
      const paymentIntent = `pi_${user}`;
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
          data: [
            {
              status: 'paid',
              amount_paid: 1900,
              payment: { type: 'payment_intent', payment_intent: paymentIntent },
            },
          ],
        } as never,
      });
      const deps = { stripe: stripe.client, store, log: () => undefined, alert: () => undefined };
      const send = async (type: Parameters<typeof event>[1], object: object) => {
        const id = `evt_${crypto.randomUUID()}`;
        eventIds.push(id);
        return handleStripeEvent(event(id, type, object), deps);
      };
      const fail = (refundId: string, reason: string) =>
        send('refund.failed', stripe.setRefundStatus(refundId, 'failed', reason));
      stripe.setNextRefundStatus('pending');
      const create = stripe.fake.refunds.create.getMockImplementation()!;
      if (lose) {
        stripe.fake.refunds.create.mockImplementationOnce(async (...args) => {
          await create(...args);
          throw new Error('Request timed out');
        });
      }
      const checkout = send('checkout.session.completed', {
        id: `cs_${user}`,
        mode: 'subscription',
        client_reference_id: user,
        customer: customerId,
        subscription: dupId,
      });
      if (lose) await expect(checkout).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      else await checkout;
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'pending',
        refundId: lose ? null : 're_1',
        attempts: 1,
      });
      /** Another webhook for the customer, which settles its open rows. */
      const later = () =>
        send('customer.subscription.updated', { id: keep.id, customer: customerId });
      return { stripe, dupId, customerId, paymentIntent, send, fail, deps, later, create };
    }

    function manualLines(spy: ReturnType<typeof vi.spyOn>) {
      return spy.mock.calls.filter((call) =>
        String(call[0]).startsWith(DUPLICATE_REFUND_MANUAL_LOG),
      );
    }

    it(`hands the row to a person after ${MAX_DUPLICATE_REFUND_ATTEMPTS} failed refunds, with no 4th`, async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { stripe, dupId, fail, send, customerId } = await setUp(cappedUser);
      await fail('re_1', 'declined');
      await fail('re_2', 'unknown');
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'pending',
        refundId: 're_3',
        attempts: 3,
      });
      await fail('re_3', 'declined');
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'needs_attention',
        refundId: 're_3',
        attempts: 3,
        lastError: 'refund re_3 failed: declined',
        resolvedAt: null,
      });
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
      expect(manualLines(errors)).toHaveLength(1);

      // A redelivered failure and another customer event make nothing more.
      await fail('re_3', 'declined');
      await send('customer.subscription.updated', {
        id: `sub_keep_${cappedUser}`,
        customer: customerId,
      });
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
      expect(manualLines(errors)).toHaveLength(1);
      // Still listed as owed, so customer events keep checking whether it was paid back.
      expect((await store.listOpenDuplicateRefunds(customerId)).map((r) => r.status)).toEqual([
        'needs_attention',
      ]);
      errors.mockRestore();
    });

    it('hands a permanent failure to a person at once, then closes it on charge.refunded', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { stripe, dupId, fail, send, customerId, paymentIntent } = await setUp(permanentUser);
      await fail('re_1', 'lost_or_stolen_card');
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'needs_attention',
        attempts: 1,
        lastError: 'refund re_1 failed: lost_or_stolen_card',
      });
      expect(manualLines(errors)).toHaveLength(1);
      // Rows a person owns are never re-pointed at a new refund.
      expect(await store.trackDuplicateRefund(dupId, 're_1', 're_x', { attempts: 0 })).toBe(false);
      expect(
        await store.flagDuplicateRefund(dupId, 're_1', 'again', {
          refundId: 're_1',
          attempts: 1,
          expectedAttempts: 1,
        }),
      ).toBeNull();
      expect(await store.reserveDuplicateRefundAttempt(dupId, 1, 2)).toBe(false);

      stripe.addRefund({
        id: 're_dash',
        payment_intent: paymentIntent,
        amount: 1900,
        status: 'succeeded',
      });
      await send('charge.refunded', { id: `ch_${permanentUser}`, customer: customerId });
      const closed = await store.getDuplicateRefund(dupId);
      expect(closed).toMatchObject({ status: 'refunded', refundId: 're_dash', lastError: null });
      expect(closed?.resolvedAt).toBeInstanceOf(Date);
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      errors.mockRestore();
    });

    it('makes one replacement, counted once, when failure events race', async () => {
      const { stripe, dupId, deps } = await setUp(raceRefundUser);
      const failed = stripe.setRefundStatus('re_1', 'failed', 'declined');
      const retrieve = stripe.fake.refunds.retrieve.getMockImplementation()!;
      let waiting = 0;
      let open!: () => void;
      const opened = new Promise<void>((resolve) => (open = resolve));
      stripe.fake.refunds.retrieve.mockImplementation(async (id: string) => {
        if (++waiting >= 3) open();
        await opened;
        return retrieve(id);
      });
      const ids = Array.from({ length: 3 }, () => `evt_${crypto.randomUUID()}`);
      eventIds.push(...ids);

      const results = await Promise.allSettled(
        ids.map((id) => handleStripeEvent(event(id, 'refund.failed', failed), deps)),
      );

      expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2']);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'pending',
        refundId: 're_2',
        attempts: 2,
      });
      // A loser that re-read the row before the winner stored re_2 saw only the failed re_1, so
      // it asked for a redelivery. The redelivery finds re_2 in flight and makes nothing more.
      const retried = ids.filter((_, i) => results[i]!.status === 'rejected');
      expect(retried.length).toBeLessThan(ids.length);
      for (const result of results) {
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(DuplicateRefundPendingError);
        }
      }
      for (const id of retried) {
        expect(await handleStripeEvent(event(id, 'refund.failed', failed), deps)).toBe('duplicate');
      }
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
    });

    it('moves the row to the manual state once when settlers race at the cap', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { dupId } = await setUp(raceCapUser);
      // Three refunds already made, the third now failed.
      await database
        .update(schema.billingDuplicateRefunds)
        .set({ attempts: 3 })
        .where(eq(schema.billingDuplicateRefunds.stripeSubscriptionId, dupId));
      const flags = await Promise.all(
        Array.from({ length: 4 }, () =>
          store.flagDuplicateRefund(dupId, 're_1', 'failed: declined', {
            refundId: 're_1',
            attempts: 3,
            expectedAttempts: 3,
          }),
        ),
      );
      expect(flags.filter(Boolean)).toHaveLength(1);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'needs_attention',
        attempts: 3,
      });
      errors.mockRestore();
    });

    it('hands an unseen refund that failed permanently to a person, even after its key is pruned', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { stripe, dupId, later } = await setUp(lostPermanentUser, { lose: true });
      stripe.setRefundStatus('re_1', 'failed', 'expired_or_canceled_card');
      stripe.pruneIdempotencyKeys();

      await later();
      expect([...stripe.refunds.keys()]).toEqual(['re_1']);
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'needs_attention',
        refundId: 're_1',
        attempts: 1,
        lastError: 'refund re_1 failed: expired_or_canceled_card',
      });
      expect(manualLines(errors)).toHaveLength(1);
      errors.mockRestore();
    });

    it('counts unseen failed refunds toward the cap, with no 4th', async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { stripe, dupId, later, create } = await setUp(lostCapUser, { lose: true });
      for (const n of [1, 2, 3]) {
        stripe.setRefundStatus(`re_${n}`, 'failed', 'declined');
        stripe.pruneIdempotencyKeys();
        if (n < 3) {
          stripe.fake.refunds.create.mockImplementationOnce(async (...args) => {
            await create(...args);
            throw new Error('Request timed out');
          });
          // Not the event that found the duplicate, so it is answered 200 either way.
          expect(await later()).toBe('processed');
          expect(await store.getDuplicateRefund(dupId)).toMatchObject({
            status: 'pending',
            refundId: null,
            attempts: n + 1,
          });
        } else {
          await later();
        }
      }
      expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2', 're_3']);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'needs_attention',
        refundId: 're_3',
        attempts: 3,
      });
      await later();
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(3);
      expect(manualLines(errors)).toHaveLength(1);
      errors.mockRestore();
    });

    it('retries an attempt recorded before a crash under the same key and gets the same refund', async () => {
      const { stripe, dupId, later, fail } = await setUp(crashUser);
      // Attempt 2 is recorded, then the process dies before Stripe's answer is stored.
      const reserve = store.reserveDuplicateRefundAttempt.bind(store);
      const spy = vi
        .spyOn(store, 'reserveDuplicateRefundAttempt')
        .mockImplementationOnce(async (...args) => {
          await reserve(...args);
          throw new Error('process killed');
        });
      await expect(fail('re_1', 'declined')).rejects.toBeInstanceOf(DuplicateRefundPendingError);
      spy.mockRestore();
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        refundId: 're_1',
        attempts: 2,
      });

      // The next settlement retries attempt 2 under its key: one refund, re_2.
      await later();
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        refundId: 're_2',
        attempts: 2,
      });
      // Replay the case where Stripe made re_2 but the row never stored it and the refund list
      // lags behind: the retry of attempt 2 reuses its key and Stripe hands back re_2.
      stripe.fake.refunds.list.mockResolvedValueOnce({
        object: 'list',
        has_more: false,
        data: [stripe.refunds.get('re_1')!],
      } as never);
      await database
        .update(schema.billingDuplicateRefunds)
        .set({ refundId: 're_1' })
        .where(eq(schema.billingDuplicateRefunds.stripeSubscriptionId, dupId));
      await later();

      const keys = stripe.fake.refunds.create.mock.calls.map((call) => call[1]?.idempotencyKey);
      expect(keys).toEqual([
        `sagelytics-duplicate-refund-${dupId}`,
        `sagelytics-duplicate-refund-${dupId}-attempt-2`,
        `sagelytics-duplicate-refund-${dupId}-attempt-2`,
      ]);
      expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2']);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'pending',
        refundId: 're_2',
        attempts: 2,
      });
    });

    describe('settlers racing the event that owns the row', () => {
      /**
       * A duplicate for `user` whose checkout event (the owner) is held at its reservation while a
       * customer.subscription.deleted event settles the same row and takes the attempt first.
       */
      async function race(user: string, winner: { refundStatus?: string; error?: boolean }) {
        const customerId = `cus_${user}`;
        await store.linkCustomer(user, customerId);
        const stripe = createFakeStripe();
        const keep = subscription({ id: `sub_keep_${user}`, customer: customerId, created: 1 });
        stripe.setSubscription(keep);
        stripe.payPeriod(keep);
        const dupId = `sub_dup_${user}`;
        stripe.setSubscription(
          subscription({
            id: dupId,
            customer: customerId,
            created: 2,
            latestInvoice: `in_${dupId}`,
          }),
        );
        stripe.setInvoice({
          id: `in_${dupId}`,
          status: 'paid',
          payments: {
            object: 'list',
            has_more: false,
            url: '',
            data: [
              {
                status: 'paid',
                amount_paid: 1900,
                payment: { type: 'payment_intent', payment_intent: `pi_${user}` },
              },
            ],
          } as never,
        });
        const deps = { stripe: stripe.client, store, log: () => undefined, alert: () => undefined };
        const checkoutId = `evt_${crypto.randomUUID()}`;
        const deletedId = `evt_${crypto.randomUUID()}`;
        eventIds.push(checkoutId, deletedId);
        const checkout = event(checkoutId, 'checkout.session.completed', {
          id: `cs_${user}`,
          mode: 'subscription',
          client_reference_id: user,
          customer: customerId,
          subscription: dupId,
        });
        const deleted = event(deletedId, 'customer.subscription.deleted', {
          id: dupId,
          customer: customerId,
        });

        const reserve = store.reserveDuplicateRefundAttempt.bind(store);
        let reached!: () => void;
        const ownerWaiting = new Promise<void>((resolve) => (reached = resolve));
        let release!: () => void;
        const released = new Promise<void>((resolve) => (release = resolve));
        const spy = vi
          .spyOn(store, 'reserveDuplicateRefundAttempt')
          .mockImplementationOnce(async (...args) => {
            reached();
            await released;
            return reserve(...args);
          });
        const owner = handleStripeEvent(checkout, deps);
        const ownerResult = owner.then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        );
        await ownerWaiting;
        spy.mockRestore();

        if (winner.refundStatus) stripe.setNextRefundStatus(winner.refundStatus as never);
        if (winner.error) {
          stripe.fake.refunds.create.mockRejectedValueOnce(new Error('stripe 500'));
        }
        const deletedOutcome = await handleStripeEvent(deleted, deps);
        release();
        return { stripe, dupId, deps, checkout, deletedOutcome, owner: await ownerResult };
      }

      it('keeps the owning checkout event retryable when the winner got an API error', async () => {
        const { stripe, dupId, deps, checkout, deletedOutcome, owner } = await race(
          ownerRaceErrorUser,
          { error: true },
        );
        expect(deletedOutcome).toBe('processed');
        expect(owner.ok).toBe(false);
        expect(owner.ok ? null : owner.error).toBeInstanceOf(DuplicateRefundPendingError);
        expect(stripe.refunds.size).toBe(0);
        expect(await store.getDuplicateRefund(dupId)).toMatchObject({
          status: 'pending',
          refundId: null,
          attempts: 1,
          lastError: 'stripe 500',
        });

        // Stripe's redelivery of the checkout event makes the refund under attempt 1's key.
        expect(await handleStripeEvent(checkout, deps)).toBe('duplicate');
        expect(stripe.fake.refunds.create.mock.calls.map((call) => call[1])).toEqual([
          { idempotencyKey: `sagelytics-duplicate-refund-${dupId}` },
          { idempotencyKey: `sagelytics-duplicate-refund-${dupId}` },
        ]);
        expect([...stripe.refunds.keys()]).toEqual(['re_1']);
        expect(await store.getDuplicateRefund(dupId)).toMatchObject({
          status: 'refunded',
          refundId: 're_1',
          attempts: 1,
        });
      });

      it('acknowledges the owning checkout event once the winner has a refund in flight', async () => {
        const { stripe, dupId, owner } = await race(ownerRaceOkUser, { refundStatus: 'pending' });
        expect(owner).toEqual({ ok: true, value: 'processed' });
        expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(1);
        expect(await store.getDuplicateRefund(dupId)).toMatchObject({
          status: 'pending',
          refundId: 're_1',
          attempts: 1,
        });
      });

      it('settles a row Stripe stopped retrying with the maintenance sweep', async () => {
        const { stripe, dupId, owner } = await race(sweepUser, { error: true });
        expect(owner.ok).toBe(false);
        // No more events arrive for this customer. The sweep settles it like a webhook would.
        const results = await settleOpenDuplicateRefunds({
          stripe: stripe.client,
          store,
          log: () => undefined,
          alert: () => undefined,
        });
        expect(results.find((row) => row.subscription === dupId)).toMatchObject({
          settlement: 'settled',
          status: 'refunded',
        });
        expect(stripe.fake.refunds.create.mock.calls.at(-1)?.[1]).toEqual({
          idempotencyKey: `sagelytics-duplicate-refund-${dupId}`,
        });
        expect([...stripe.refunds.keys()]).toEqual(['re_1']);
      });
    });

    it('makes one refund per attempt when settlers race after an unseen failure', async () => {
      const { stripe, dupId, deps, customerId } = await setUp(raceAttemptUser, { lose: true });
      stripe.setRefundStatus('re_1', 'failed', 'declined');
      stripe.pruneIdempotencyKeys();
      const list = stripe.fake.refunds.list.getMockImplementation()!;
      let waiting = 0;
      let open!: () => void;
      const opened = new Promise<void>((resolve) => (open = resolve));
      stripe.fake.refunds.list.mockImplementation(async (params) => {
        if (++waiting >= 4) open();
        await opened;
        return list(params);
      });
      const ids = Array.from({ length: 4 }, () => `evt_${crypto.randomUUID()}`);
      eventIds.push(...ids);

      await Promise.all(
        ids.map((id) =>
          handleStripeEvent(
            event(id, 'customer.subscription.updated', {
              id: `sub_keep_${raceAttemptUser}`,
              customer: customerId,
            }),
            deps,
          ),
        ),
      );

      expect([...stripe.refunds.keys()]).toEqual(['re_1', 're_2']);
      expect(stripe.fake.refunds.create).toHaveBeenCalledTimes(2);
      expect(await store.getDuplicateRefund(dupId)).toMatchObject({
        status: 'pending',
        refundId: 're_2',
        attempts: 2,
      });
    });
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
