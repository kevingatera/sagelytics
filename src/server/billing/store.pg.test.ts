import { eq } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as schema from '~/server/db/schema';

import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { createBillingService } from './service';
import { BILLING_LOCK_NAMESPACE, createDrizzleBillingStore, userLockSql } from './store';
import { createFakeStripe, event, subscription } from './testing/fake-stripe';
import { handleStripeEvent } from './webhook';

describe('userLockSql', () => {
  it('takes a transaction-scoped advisory lock keyed by namespace and user id', () => {
    const query = new PgDialect().sqlToQuery(userLockSql('user-alice'));
    expect(query.sql).toBe('select pg_advisory_xact_lock($1, hashtext($2))');
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
  const allUsers = [userId, raceUser, clockUser, monitorUser];
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
});
