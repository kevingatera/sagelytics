import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';

import { monitoringTasks, users } from '~/server/db/schema';
import { db } from '~/server/db';
import { POST, PUT } from './route';

const { url, userId, testDb } = vi.hoisted(() => ({
  url: process.env.MONITORING_TEST_DATABASE_URL,
  userId: `monitoring-test-${crypto.randomUUID()}`,
  testDb: {} as { conn?: postgres.Sql },
}));

vi.mock('~/server/auth', async () => {
  const { checkWriteSession } = await import('~/server/auth/write-session');
  const session = { user: { id: userId }, expires: '' };
  return { auth: async () => session, requireWriteSession: async () => checkWriteSession(session as never) };
});
vi.mock('~/server/db', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  const schema = await import('~/server/db/schema');
  testDb.conn = connect(url ?? 'postgres://unused');
  return { db: drizzle(testDb.conn, { schema }) };
});
vi.mock('~/env', () => ({ env: {} }));
vi.mock('~/server/billing/config', () => ({
  getBillingConfig: () => ({
    enabled: false,
    limits: {
      free: { discoveriesPerPeriod: 2, monitoredProducts: 5 },
      pro: { discoveriesPerPeriod: 50, monitoredProducts: 200 },
    },
  }),
}));
vi.mock('~/server/rate-limit', async (importOriginal) => {
  const { createRateLimiter, createMemoryStore } = await importOriginal<typeof import('~/server/rate-limit')>();
  const limiter = createRateLimiter({ primary: null, fallback: createMemoryStore() });
  return { getRateLimiter: () => limiter };
});

function request(method: 'POST' | 'PUT', body: object) {
  return new Request('http://localhost/api/monitoring-tasks', {
    method,
    body: JSON.stringify(body),
  });
}

function products(count: number) {
  return Array.from({ length: count }, (_, id) => ({
    id: String(id), name: `Product ${id}`, url: `https://rival.test/product/${id}`,
  }));
}

describe.skipIf(!url)('monitoring routes against Postgres', () => {
  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `${userId}@example.test` });
  });

  afterAll(async () => {
    await db.delete(monitoringTasks).where(eq(monitoringTasks.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await testDb.conn?.end();
  });

  it('serializes concurrent creates and competing URL replacements', async () => {
    const create = (competitorDomain: string, count: number) => POST(request('POST', {
      competitorDomain, frequency: '0 * * * *', productUrls: products(count),
    }));

    const creates = await Promise.all([create('one.test', 2), create('two.test', 2), create('three.test', 2)]);
    expect(creates.map(({ status }) => status).sort()).toEqual([201, 201, 402]);

    const tasks = await db.query.monitoringTasks.findMany({ where: eq(monitoringTasks.userId, userId) });
    const replacements = await Promise.all(tasks.map(({ id }) =>
      PUT(request('PUT', { taskId: id, productUrls: products(3) })),
    ));
    expect(replacements.map(({ status }) => status).sort()).toEqual([200, 402]);

    const updated = await db.query.monitoringTasks.findMany({ where: eq(monitoringTasks.userId, userId) });
    expect(updated.reduce((sum, task) => sum + task.productUrls.length, 0)).toBe(5);
  });
});
