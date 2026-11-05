import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  tasks: new Map<string, { id: string; userId: string; enabled: boolean }>(),
}));

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

// Stand-in for the query layer with the same ownership contract: a task that
// belongs to another user matches nothing.
vi.mock('~/server/db/queries/monitoring', () => ({
  createMonitoringTask: vi.fn(),
  getMonitoringTasksByUser: vi.fn(),
  updateMonitoringTask: vi.fn(
    async (taskId: string, userId: string, updates: { enabled?: boolean }) => {
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

import { updateMonitoringTask, deleteMonitoringTask } from '~/server/db/queries/monitoring';
import { DELETE, PUT } from './route';

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

function deleteRequest(taskId: string) {
  return new Request(`http://localhost/api/monitoring-tasks?taskId=${taskId}`, {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = null;
  state.tasks.clear();
  state.tasks.set(TASK_ID, { id: TASK_ID, userId: ALICE, enabled: true });
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
