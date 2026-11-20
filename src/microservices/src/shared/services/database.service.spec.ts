import { DatabaseService } from './database.service';

type Captured = { text: string; values: unknown[] };

/** Tagged-template stand-in for postgres.Sql that records each query and returns `rows`. */
function withFakeConnection(rows: Array<Record<string, unknown>>) {
  const queries: Captured[] = [];
  const conn = (strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({
      text: strings.join('$?').replace(/\s+/g, ' ').trim(),
      values,
    });
    return Promise.resolve(rows);
  };
  const service = new DatabaseService();
  (service as unknown as { conn: unknown }).conn = conn;
  return { service, queries };
}

describe('DatabaseService.getPriceSeriesForUser', () => {
  it("scopes the read to the caller's monitoring tasks", async () => {
    const { service, queries } = withFakeConnection([]);

    await service.getPriceSeriesForUser(
      'user-bob',
      'https://competitor.example/pro',
    );

    expect(queries).toHaveLength(1);
    const [query] = queries;
    expect(query.text).toContain(
      'INNER JOIN sg_monitoring_tasks mt ON mt.id = ph.monitoring_task_id',
    );
    expect(query.text).toContain('WHERE mt.user_id = $?');
    expect(query.text).toContain('AND ph.product_url = $?');
    expect(query.values.slice(0, 2)).toEqual([
      'user-bob',
      'https://competitor.example/pro',
    ]);
  });

  it('returns rows oldest first with numeric prices', async () => {
    const { service } = withFakeConnection([
      {
        recorded_at: new Date('2026-11-10T00:00:00Z'),
        price: '49.00',
        change_percentage: '22.50',
      },
      {
        recorded_at: new Date('2026-11-01T00:00:00Z'),
        price: '40.00',
        change_percentage: null,
      },
    ]);

    await expect(
      service.getPriceSeriesForUser(
        'user-alice',
        'https://competitor.example/pro',
      ),
    ).resolves.toEqual([
      {
        recordedAt: new Date('2026-11-01T00:00:00Z'),
        price: 40,
        changePercentage: null,
      },
      {
        recordedAt: new Date('2026-11-10T00:00:00Z'),
        price: 49,
        changePercentage: 22.5,
      },
    ]);
  });
});

describe('DatabaseService monitoring claims', () => {
  it('claims a bounded oldest-first batch in one statement with a per-user cap', async () => {
    const scheduledAt = new Date('2026-11-01T00:00:00Z');
    const claimedUntil = new Date('2026-11-01T00:15:00Z');
    const { service, queries } = withFakeConnection([
      { id: 'task-1', scheduled_at: scheduledAt, claimed_until: claimedUntil },
    ]);

    await expect(
      service.claimDueMonitoringTasks(25, 5, 655_000),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'task-1',
        nextRun: scheduledAt,
        claimedUntil,
      }),
    ]);

    expect(queries).toHaveLength(1);
    const [query] = queries;
    expect(query.text).toContain(
      'PARTITION BY user_id ORDER BY coalesce(next_run, created_at), id',
    );
    expect(query.text).toContain('WHERE ranked.user_rank <= $?');
    expect(query.text).toContain(
      'ORDER BY ranked.due_at, task.id LIMIT $? FOR UPDATE OF task SKIP LOCKED',
    );
    expect(query.text).toContain(
      'task.claimed_until IS NULL OR task.claimed_until <= statement_timestamp()',
    );
    expect(query.text).toMatch(
      /UPDATE sg_monitoring_tasks task SET claimed_until = .*FROM due WHERE task.id = due.id RETURNING/,
    );
    expect(query.values).toEqual([5, 25, 655_000]);
  });

  it('finalizes only the current lease and releases it in the same update', async () => {
    const { service, queries } = withFakeConnection([]);
    const claimedUntil = new Date('2026-11-01T00:15:00Z');
    const task = {
      id: 'task-1',
      claimedUntil,
      productUrls: [],
      urlCursor: 0,
    } as unknown as Parameters<typeof service.finishMonitoringTask>[0];
    const lastRun = new Date('2026-11-01T00:01:00Z');
    const nextRun = new Date('2026-11-02T00:00:00Z');

    await service.finishMonitoringTask(task, lastRun, nextRun, 2);

    expect(queries).toHaveLength(1);
    expect(queries[0].text).toContain('claimed_until = NULL');
    expect(queries[0].text).toContain(
      'WHERE id = $? AND claimed_until = $? AND claimed_until > clock_timestamp()',
    );
    expect(queries[0].values).toEqual([
      lastRun,
      nextRun,
      '[]',
      2,
      task.id,
      claimedUntil,
    ]);
  });
});
