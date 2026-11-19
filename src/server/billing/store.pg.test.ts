import { eq } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as schema from '~/server/db/schema';

import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { createBillingService } from './service';
import { BILLING_LOCK_NAMESPACE, createDrizzleBillingStore, userLockSql } from './store';

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
    await database.insert(schema.users).values({ id: userId, email: `${userId}@example.test` });
  });

  afterAll(async () => {
    await database.delete(schema.usageEvents).where(eq(schema.usageEvents.userId, userId));
    await database
      .delete(schema.billingSubscriptions)
      .where(eq(schema.billingSubscriptions.userId, userId));
    for (const id of eventIds)
      await database.delete(schema.stripeEvents).where(eq(schema.stripeEvents.id, id));
    await database.delete(schema.users).where(eq(schema.users.id, userId));
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
});
