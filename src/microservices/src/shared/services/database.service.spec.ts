import { DatabaseService } from './database.service';

type Captured = { text: string; values: unknown[] };

/** Tagged-template stand-in for postgres.Sql that records each query and returns `rows`. */
function withFakeConnection(rows: Array<Record<string, unknown>>) {
  const queries: Captured[] = [];
  const conn = (strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({ text: strings.join('$?').replace(/\s+/g, ' ').trim(), values });
    return Promise.resolve(rows);
  };
  const service = new DatabaseService();
  (service as unknown as { conn: unknown }).conn = conn;
  return { service, queries };
}

describe('DatabaseService.getPriceSeriesForUser', () => {
  it("scopes the read to the caller's monitoring tasks", async () => {
    const { service, queries } = withFakeConnection([]);

    await service.getPriceSeriesForUser('user-bob', 'https://competitor.example/pro');

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
      { recorded_at: new Date('2026-11-10T00:00:00Z'), price: '49.00', change_percentage: '22.50' },
      { recorded_at: new Date('2026-11-01T00:00:00Z'), price: '40.00', change_percentage: null },
    ]);

    await expect(
      service.getPriceSeriesForUser('user-alice', 'https://competitor.example/pro'),
    ).resolves.toEqual([
      { recordedAt: new Date('2026-11-01T00:00:00Z'), price: 40, changePercentage: null },
      { recordedAt: new Date('2026-11-10T00:00:00Z'), price: 49, changePercentage: 22.5 },
    ]);
  });
});
