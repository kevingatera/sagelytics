import postgres from 'postgres';
import { DatabaseService } from './database.service';

// Runs against a migrated, disposable database only when MONITORING_TEST_DATABASE_URL is set.
const url = process.env.MONITORING_TEST_DATABASE_URL;
const describePg = url ? describe : describe.skip;

describePg('DatabaseService monitoring claims (Postgres)', () => {
  let sql: postgres.Sql;
  const services: DatabaseService[] = [];

  function service(): DatabaseService {
    const db = new DatabaseService();
    (db as unknown as { conn: postgres.Sql }).conn = postgres(url!, { max: 2 });
    services.push(db);
    return db;
  }

  async function addTask(userId: string, nextRun: string | null) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO sg_monitoring_tasks (user_id, competitor_domain, product_urls, frequency, next_run)
      VALUES (${userId}, 'rival.test', '[]'::jsonb, '0 * * * *',
        ${nextRun === null ? null : sql`(now() AT TIME ZONE 'UTC') + ${nextRun}::interval`})
      RETURNING id`;
    return row!.id;
  }

  beforeAll(async () => {
    sql = postgres(url!, { max: 2 });
    await sql`INSERT INTO sg_user (id, email) VALUES ('pg-u1', 'pg-u1@example.test'), ('pg-u2', 'pg-u2@example.test') ON CONFLICT DO NOTHING`;
  });

  beforeEach(async () => {
    await sql`DELETE FROM sg_monitoring_tasks WHERE user_id IN ('pg-u1', 'pg-u2')`;
  });

  afterAll(async () => {
    await sql`DELETE FROM sg_monitoring_tasks WHERE user_id IN ('pg-u1', 'pg-u2')`;
    await sql`DELETE FROM sg_user WHERE id IN ('pg-u1', 'pg-u2')`;
    await Promise.all(
      services.map((s) => (s as unknown as { conn: postgres.Sql }).conn.end()),
    );
    await sql.end();
  });

  it('claims only due tasks, caps each user and leases what it claims', async () => {
    for (let i = 0; i < 8; i++) await addTask('pg-u1', '-1 hour');
    await addTask('pg-u2', '-5 minutes');
    await addTask('pg-u2', null);
    await addTask('pg-u2', '+1 hour');

    const claimed = await service().claimDueMonitoringTasks(25, 5, 60_000);

    const byUser = claimed.reduce<Record<string, number>>((acc, t) => {
      acc[t.userId] = (acc[t.userId] ?? 0) + 1;
      return acc;
    }, {});
    expect(byUser).toEqual({ 'pg-u1': 5, 'pg-u2': 2 });
    for (const task of claimed) {
      expect(task.claimedUntil.getTime()).toBeGreaterThan(Date.now() + 30_000);
    }

    expect(await service().claimDueMonitoringTasks(25, 5, 60_000)).toHaveLength(3);
    expect(await service().claimDueMonitoringTasks(25, 5, 60_000)).toHaveLength(0);
  });

  it('never hands the same task to two concurrent claimers', async () => {
    for (let i = 0; i < 6; i++) await addTask('pg-u1', '-1 minute');
    for (let i = 0; i < 6; i++) await addTask('pg-u2', '-1 minute');

    const results = await Promise.all(
      [service(), service(), service()].map((s) =>
        s.claimDueMonitoringTasks(4, 10, 60_000),
      ),
    );
    const ids = results.flat().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(12);
  });

  it('finishes only under its own live lease and schedules from the stored slot', async () => {
    const id = await addTask('pg-u1', '-10 minutes');
    const db = service();
    const [task] = await db.claimDueMonitoringTasks(1, 5, 60_000);
    expect(task!.id).toBe(id);

    const stored = await sql<{ next_run: Date }[]>`SELECT next_run FROM sg_monitoring_tasks WHERE id = ${id}`;
    // next_run is a UTC wall-clock timestamp without time zone; the claim must read it as UTC.
    expect(Math.abs(task!.nextRun!.getTime() - (Date.now() - 10 * 60_000))).toBeLessThan(5_000);
    expect(stored).toHaveLength(1);

    const stale = { ...task!, claimedUntil: new Date(task!.claimedUntil.getTime() - 1) };
    await db.finishMonitoringTask(stale, new Date(), new Date(Date.now() + 3_600_000));
    const [afterStale] = await sql<{ claimed_until: Date | null }[]>`SELECT claimed_until FROM sg_monitoring_tasks WHERE id = ${id}`;
    expect(afterStale!.claimed_until).not.toBeNull();

    const next = new Date(Date.now() + 3_600_000);
    await db.finishMonitoringTask(task!, new Date(), next);
    const [done] = await sql<{ claimed_until: Date | null; next_utc: Date }[]>`
      SELECT claimed_until, next_run AT TIME ZONE 'UTC' AS next_utc FROM sg_monitoring_tasks WHERE id = ${id}`;
    expect(done!.claimed_until).toBeNull();
    expect(Math.abs(done!.next_utc.getTime() - next.getTime())).toBeLessThan(1_000);
  });

  it('lets another worker reclaim a task whose lease expired', async () => {
    await addTask('pg-u1', '-1 minute');
    const [first] = await service().claimDueMonitoringTasks(1, 5, 50);
    await new Promise((r) => setTimeout(r, 120));
    const [second] = await service().claimDueMonitoringTasks(1, 5, 60_000);
    expect(second?.id).toBe(first!.id);
  });
});
