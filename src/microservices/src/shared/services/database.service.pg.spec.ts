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
    await sql`DELETE FROM sg_billing_subscription WHERE user_id IN ('pg-u1', 'pg-u2')`;
    await sql`DELETE FROM sg_monitoring_tasks WHERE user_id IN ('pg-u1', 'pg-u2')`;
  });

  afterAll(async () => {
    await sql`DELETE FROM sg_billing_subscription WHERE user_id IN ('pg-u1', 'pg-u2')`;
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
    await db.finishMonitoringTask(stale, new Date(), new Date(Date.now() + 3_600_000), 9);
    const [afterStale] = await sql<{ claimed_until: Date | null; url_cursor: number }[]>`SELECT claimed_until, url_cursor FROM sg_monitoring_tasks WHERE id = ${id}`;
    expect(afterStale!.claimed_until).not.toBeNull();
    expect(afterStale!.url_cursor).toBe(0);

    const next = new Date(Date.now() + 3_600_000);
    await db.finishMonitoringTask(task!, new Date(), next, 3);
    const [done] = await sql<{ claimed_until: Date | null; next_utc: Date; url_cursor: number }[]>`
      SELECT claimed_until, url_cursor, next_run AT TIME ZONE 'UTC' AS next_utc FROM sg_monitoring_tasks WHERE id = ${id}`;
    expect(done!.claimed_until).toBeNull();
    expect(done!.url_cursor).toBe(3);
    expect(Math.abs(done!.next_utc.getTime() - next.getTime())).toBeLessThan(1_000);
  });

  it('lets another worker reclaim a task whose lease expired', async () => {
    await addTask('pg-u1', '-1 minute');
    const [first] = await service().claimDueMonitoringTasks(1, 5, 50);
    await new Promise((r) => setTimeout(r, 120));
    const [second] = await service().claimDueMonitoringTasks(1, 5, 60_000);
    expect(second?.id).toBe(first!.id);
  });
  it('checks the live allowance across tasks, including expiration and downgrade', async () => {
    const previous = process.env.MONITORING_BILLING_ENABLED;
    process.env.MONITORING_BILLING_ENABLED = 'true';
    try {
      const first = await addTask('pg-u1', '-2 minutes');
      const second = await addTask('pg-u1', '-1 minute');
      const products = Array.from({ length: 4 }, (_, id) => ({
        id: String(id), name: `Product ${id}`, url: `https://rival.test/${id}`,
      }));
      await sql`UPDATE sg_monitoring_tasks SET product_urls = ${JSON.stringify(products)}::text::jsonb
        WHERE id IN (${first}, ${second})`;
      await sql`UPDATE sg_monitoring_tasks SET created_at = created_at - interval '1 minute' WHERE id = ${first}`;
      await sql`INSERT INTO sg_billing_subscription (user_id, stripe_customer_id, status, current_period_end, paid_period_end)
        VALUES ('pg-u1', 'pg-customer', 'active', now() - interval '1 day', now() - interval '1 day')`;

      const db = service();
      const tasks = await db.claimDueMonitoringTasks(10, 5, 60_000);
      const eligible = () => Promise.all(tasks.map((task) => db.getEligibleMonitoringProductCount(task)));
      expect(tasks.map((task) => task.id)).toEqual([first, second]);
      expect(await eligible()).toEqual([4, 4]);

      await sql`UPDATE sg_billing_subscription SET status = 'canceled' WHERE user_id = 'pg-u1'`;
      expect(await eligible()).toEqual([4, 1]);

      await sql`UPDATE sg_billing_subscription SET status = 'active', current_period_end = now() - interval '4 days',
        paid_period_end = now() - interval '4 days' WHERE user_id = 'pg-u1'`;
      expect(await eligible()).toEqual([4, 1]);

      // An unpaid renewal moves the current period but not the paid one, so it grants nothing.
      await sql`UPDATE sg_billing_subscription SET status = 'past_due', current_period_end = now() + interval '30 days'
        WHERE user_id = 'pg-u1'`;
      expect(await eligible()).toEqual([4, 1]);

      await sql`UPDATE sg_monitoring_tasks SET enabled = false WHERE id = ${first}`;
      expect(await eligible()).toEqual([0, 4]);
    } finally {
      if (previous === undefined) delete process.env.MONITORING_BILLING_ENABLED;
      else process.env.MONITORING_BILLING_ENABLED = previous;
    }
  });

});
