import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  tasks: new Map<
    string,
    { id: string; userId: string; enabled: boolean; productUrls: Array<{ id: string; name: string; url: string }> }
  >(),
}));

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

// Stand-in for the query layer with the same ownership contract: a task that
// belongs to another user matches nothing.
vi.mock('~/server/db/queries/monitoring', () => ({
  createMonitoringTask: vi.fn(async (data: Record<string, unknown>) => ({ id: 'task-new', ...data })),
  getMonitoringTasksByUser: vi.fn(),
  getMonitoringTaskById: vi.fn(async (taskId: string) => state.tasks.get(taskId)),
  updateMonitoringTask: vi.fn(
    async (taskId: string, userId: string, updates: Record<string, unknown>) => {
      const task = state.tasks.get(taskId);
      if (!task || task.userId !== userId) return undefined;
      Object.assign(task, updates);
      return task;
    },
  ),
  deleteMonitoringTask: vi.fn(async (taskId: string, userId: string) => {
    const task = state.tasks.get(taskId);
    if (!task || task.userId !== userId) return undefined;
    state.tasks.delete(taskId);
    return { id: taskId };
  }),
}));

const billing = vi.hoisted(() => ({
  limit: 5,
  used: 0,
  assertCanMonitorProducts: vi.fn(),
}));

vi.mock('~/server/billing', async () => {
  const errors = await import('~/server/billing/errors');
  billing.assertCanMonitorProducts.mockImplementation(async (_userId: string, adding: number) => {
    if (billing.used + adding > billing.limit) {
      throw new errors.BillingLimitError({
        resource: 'monitored_product',
        plan: 'free',
        limit: billing.limit,
        used: billing.used,
        resetsAt: null,
      });
    }
    return { used: billing.used, limit: billing.limit, remaining: billing.limit - billing.used };
  });
  return {
    assertCanMonitorProducts: billing.assertCanMonitorProducts,
    isBillingLimitError: errors.isBillingLimitError,
  };
});

import {
  createMonitoringTask,
  updateMonitoringTask,
  deleteMonitoringTask,
} from '~/server/db/queries/monitoring';
import { DELETE, POST, PUT } from './route';

const ALICE = 'user-alice';
const BOB = 'user-bob';
const TASK_ID = '6f1c2b0e-1111-4c3d-9e8f-000000000001';

function putRequest(body: unknown) {
  return new Request('http://localhost/api/monitoring-tasks', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/monitoring-tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteRequest(taskId: string) {
  return new Request(`http://localhost/api/monitoring-tasks?taskId=${taskId}`, {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.tasks.clear();
  state.tasks.set(TASK_ID, { id: TASK_ID, userId: ALICE, enabled: true, productUrls: [] });
  billing.limit = 5;
  billing.used = 0;
});

describe('monitoring-tasks ownership', () => {
  it('rejects PUT and DELETE without a session', async () => {
    expect((await PUT(putRequest({ taskId: TASK_ID, enabled: false }))).status).toBe(401);
    expect((await DELETE(deleteRequest(TASK_ID))).status).toBe(401);
    expect(state.tasks.get(TASK_ID)?.enabled).toBe(true);
  });

  it('returns 404 and leaves the task untouched when another user updates it', async () => {
    state.session = { user: { id: BOB } };

    const res = await PUT(putRequest({ taskId: TASK_ID, enabled: false }));

    expect(res.status).toBe(404);
    expect(updateMonitoringTask).toHaveBeenCalledWith(TASK_ID, BOB, { enabled: false });
    expect(state.tasks.get(TASK_ID)?.enabled).toBe(true);
  });

  it('updates a task for its owner', async () => {
    state.session = { user: { id: ALICE } };

    const res = await PUT(putRequest({ taskId: TASK_ID, enabled: false }));

    expect(res.status).toBe(200);
    expect(state.tasks.get(TASK_ID)?.enabled).toBe(false);
  });

  it('returns 404 and keeps the task when another user deletes it', async () => {
    state.session = { user: { id: BOB } };

    const res = await DELETE(deleteRequest(TASK_ID));

    expect(res.status).toBe(404);
    expect(deleteMonitoringTask).toHaveBeenCalledWith(TASK_ID, BOB);
    expect(state.tasks.has(TASK_ID)).toBe(true);
  });

  it('deletes a task for its owner', async () => {
    state.session = { user: { id: ALICE } };

    const res = await DELETE(deleteRequest(TASK_ID));

    expect(res.status).toBe(200);
    expect(state.tasks.has(TASK_ID)).toBe(false);
  });
});

describe('monitoring-tasks product URL validation', () => {
  const base = {
    competitorDomain: 'competitor.example',
    frequency: '0 */6 * * *',
    enabled: true,
    discoverySource: 'manual',
  };

  beforeEach(() => {
    state.session = { user: { id: ALICE } };
  });

  it('creates a task for a public http(s) product page', async () => {
    const res = await POST(
      postRequest({
        ...base,
        productUrls: [{ id: 'p1', name: 'Pro', url: 'https://competitor.example/products/pro' }],
      }),
    );

    expect(res.status).toBe(201);
    expect(createMonitoringTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ALICE,
        productUrls: [{ id: 'p1', name: 'Pro', url: 'https://competitor.example/products/pro' }],
      }),
    );
  });

  it.each([
    'not a url',
    'ftp://competitor.example/p',
    'http://localhost/p',
    'http://169.254.169.254/latest/meta-data',
  ])('rejects %s with 400 and creates nothing', async (url) => {
    const res = await POST(postRequest({ ...base, productUrls: [{ id: 'p1', name: 'Pro', url }] }));

    expect(res.status).toBe(400);
    expect(createMonitoringTask).not.toHaveBeenCalled();
  });

  it('rejects a task with no product URLs', async () => {
    const res = await POST(postRequest({ ...base, productUrls: [] }));
    expect(res.status).toBe(400);
  });

  it('validates URLs on update too', async () => {
    const res = await PUT(
      putRequest({ taskId: TASK_ID, productUrls: [{ id: 'p1', name: 'Pro', url: 'http://10.0.0.1/' }] }),
    );

    expect(res.status).toBe(400);
    expect(updateMonitoringTask).not.toHaveBeenCalled();
  });
});

describe('monitoring-tasks monitored product limit', () => {
  const base = {
    competitorDomain: 'competitor.example',
    frequency: '0 */6 * * *',
    enabled: true,
    discoverySource: 'manual',
  };
  const urls = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      name: `Product ${i}`,
      url: `https://competitor.example/products/${i}`,
    }));

  beforeEach(() => {
    state.session = { user: { id: ALICE } };
  });

  it('creates a task that fits in the remaining allowance', async () => {
    billing.used = 3;

    const res = await POST(postRequest({ ...base, productUrls: urls(2) }));

    expect(res.status).toBe(201);
    expect(billing.assertCanMonitorProducts).toHaveBeenCalledWith(ALICE, 2);
    expect(createMonitoringTask).toHaveBeenCalled();
  });

  it('answers 402 and creates nothing when the task would exceed the cap', async () => {
    billing.used = 4;

    const res = await POST(postRequest({ ...base, productUrls: urls(2) }));

    expect(res.status).toBe(402);
    expect(await res.json()).toMatchObject({
      code: 'BILLING_LIMIT_REACHED',
      resource: 'monitored_product',
      limit: 5,
      used: 4,
      resetsAt: null,
    });
    expect(createMonitoringTask).not.toHaveBeenCalled();
  });

  it('checks only the added URLs when a task replaces its product list', async () => {
    state.tasks.get(TASK_ID)!.productUrls = urls(2);
    billing.used = 4;

    const res = await PUT(putRequest({ taskId: TASK_ID, productUrls: urls(3) }));

    expect(res.status).toBe(200);
    expect(billing.assertCanMonitorProducts).toHaveBeenCalledWith(ALICE, 1);
  });

  it('answers 402 and leaves the task when an update adds more than the cap allows', async () => {
    state.tasks.get(TASK_ID)!.productUrls = urls(1);
    billing.used = 4;

    const res = await PUT(putRequest({ taskId: TASK_ID, productUrls: urls(3) }));

    expect(res.status).toBe(402);
    expect(updateMonitoringTask).not.toHaveBeenCalled();
    expect(state.tasks.get(TASK_ID)?.productUrls).toHaveLength(1);
  });

  it('does not check the cap when an update removes URLs or leaves them alone', async () => {
    state.tasks.get(TASK_ID)!.productUrls = urls(3);
    billing.used = 5;

    expect((await PUT(putRequest({ taskId: TASK_ID, productUrls: urls(2) }))).status).toBe(200);
    expect((await PUT(putRequest({ taskId: TASK_ID, enabled: false }))).status).toBe(200);
    expect(billing.assertCanMonitorProducts).not.toHaveBeenCalled();
  });

  it("does not check the cap against another user's task", async () => {
    state.session = { user: { id: BOB } };

    const res = await PUT(putRequest({ taskId: TASK_ID, productUrls: urls(3) }));

    expect(res.status).toBe(404);
    expect(billing.assertCanMonitorProducts).not.toHaveBeenCalled();
  });
});
