import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recorded = vi.hoisted(() => ({ wheres: [] as unknown[] }));

vi.mock('~/server/db', () => {
  const chain = {
    set() {
      return chain;
    },
    where(condition: unknown) {
      recorded.wheres.push(condition);
      return chain;
    },
    returning() {
      return Promise.resolve([]);
    },
  };
  return { db: { update: () => chain, delete: () => chain } };
});

import { deleteMonitoringTask, updateMonitoringTask } from './monitoring';

const ALICE = 'user-alice';
const TASK_ID = '6f1c2b0e-1111-4c3d-9e8f-000000000001';

function renderLastWhere() {
  const condition = recorded.wheres.at(-1);
  return new PgDialect().sqlToQuery(condition as SQL);
}

beforeEach(() => {
  recorded.wheres.length = 0;
});

describe('monitoring task writes are scoped to the owner', () => {
  it('update filters by both task id and user id', async () => {
    await updateMonitoringTask(TASK_ID, ALICE, { enabled: false });

    const query = renderLastWhere();
    expect(query.sql).toContain('user_id');
    expect(query.params).toEqual([TASK_ID, ALICE]);
  });

  it('delete filters by both task id and user id', async () => {
    await deleteMonitoringTask(TASK_ID, ALICE);

    const query = renderLastWhere();
    expect(query.sql).toContain('user_id');
    expect(query.params).toEqual([TASK_ID, ALICE]);
  });
});
