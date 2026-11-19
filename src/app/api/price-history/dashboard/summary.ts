export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_RANGE_DAYS = 90;
export const MAX_RANGE_DAYS = 365;

const MAX_CHANGES = 10;
const MAX_ALERTS = 10;

export interface PricePoint {
  recordedAt: Date;
  competitorDomain: string;
  productUrl: string;
  productName: string;
  price: number | null;
  currency: string | null;
  changePercentage: number | null;
  previousPrice: number | null;
}

export interface TrackedTask {
  competitorDomain: string;
  productUrls: Array<{ url: string }>;
}

export interface AlertRow {
  id: string;
  alertType: string;
  thresholdValue: string | null;
  createdAt: Date;
  monitoringTask: { competitorDomain: string } | null;
  notificationLogs: Array<{ status: string | null }>;
}

export interface ChartRow {
  date: string;
  [domain: string]: string | number | null;
}

export interface CompetitorSummary {
  domain: string;
  trackedProducts: number;
  latestChange: number | null;
  latestRecordedAt: string | null;
}

export interface PriceChange {
  id: string;
  competitorDomain: string;
  productName: string;
  currency: string;
  previousPrice: number;
  price: number;
  changePercentage: number;
  recordedAt: string;
}

export interface DashboardAlert {
  id: string;
  alertType: string;
  competitorDomain: string | null;
  thresholdValue: number | null;
  notificationStatus: string | null;
  createdAt: string;
}

export interface DashboardPayload {
  days: number;
  trackedProductCount: number;
  yourAveragePrice: number | null;
  lastRecordedAt: string | null;
  competitors: CompetitorSummary[];
  chart: ChartRow[];
  changes: PriceChange[];
  alerts: DashboardAlert[];
}

export interface DashboardInput {
  days: number;
  tasks: TrackedTask[];
  points: PricePoint[];
  userPrices: number[];
  alerts: AlertRow[];
}

type PricedPoint = PricePoint & { price: number };
type MovedPoint = PricedPoint & { changePercentage: number; previousPrice: number };

export function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function averagePrice(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

export function countTrackedProducts(tasks: TrackedTask[]): number {
  const urls = tasks.flatMap((task) => task.productUrls.map((product) => product.url.trim()));
  return new Set(urls.filter((url) => url.length > 0)).size;
}

/**
 * One chart row per day that has a recorded price. A product keeps its last recorded
 * price until its next row, so each competitor's value is the average of the prices in
 * effect that day. Rows are only written on change or heartbeat, so this carries real
 * prices forward; it never invents a value.
 */
export function buildPriceChart(points: PricePoint[]): ChartRow[] {
  const sorted = sortByRecordedAt(points.filter(isPriced));
  const inEffect = new Map<string, { domain: string; price: number }>();
  const rows: ChartRow[] = [];

  sorted.forEach((point, index) => {
    inEffect.set(point.productUrl, { domain: point.competitorDomain, price: point.price });

    const next = sorted[index + 1];
    const endsDay = !next || toDateKey(next.recordedAt) !== toDateKey(point.recordedAt);
    if (endsDay) {
      rows.push(toChartRow(toDateKey(point.recordedAt), inEffect));
    }
  });

  return rows;
}

function toChartRow(date: string, inEffect: Map<string, { domain: string; price: number }>): ChartRow {
  const pricesByDomain = new Map<string, number[]>();
  for (const { domain, price } of inEffect.values()) {
    pricesByDomain.set(domain, [...(pricesByDomain.get(domain) ?? []), price]);
  }

  const row: ChartRow = { date };
  for (const [domain, prices] of pricesByDomain) {
    row[domain] = averagePrice(prices);
  }
  return row;
}

export function buildPriceChanges(points: PricePoint[], limit = MAX_CHANGES): PriceChange[] {
  return sortByRecordedAt(points.filter(isMoved))
    .reverse()
    .slice(0, limit)
    .map((point) => ({
      id: `${point.productUrl}-${point.recordedAt.getTime()}`,
      competitorDomain: point.competitorDomain,
      productName: point.productName,
      currency: point.currency ?? 'USD',
      previousPrice: point.previousPrice,
      price: point.price,
      changePercentage: point.changePercentage,
      recordedAt: point.recordedAt.toISOString(),
    }));
}

export function buildCompetitorSummaries(tasks: TrackedTask[], points: PricePoint[]): CompetitorSummary[] {
  const domains = [...new Set(tasks.map((task) => task.competitorDomain))].sort();

  return domains.map((domain) => {
    const own = sortByRecordedAt(points.filter((point) => point.competitorDomain === domain));
    const trackedProducts = countTrackedProducts(
      tasks.filter((task) => task.competitorDomain === domain),
    );
    const latestMove = [...own].reverse().find(isNonZeroChange);
    const newest = own.reduce<Date | null>(
      (latest, point) => (!latest || point.recordedAt > latest ? point.recordedAt : latest),
      null,
    );

    return {
      domain,
      trackedProducts,
      latestChange: latestMove?.changePercentage ?? null,
      latestRecordedAt: newest ? newest.toISOString() : null,
    };
  });
}

export function toDashboardAlert(row: AlertRow): DashboardAlert {
  return {
    id: row.id,
    alertType: row.alertType,
    competitorDomain: row.monitoringTask?.competitorDomain ?? null,
    thresholdValue: toNumber(row.thresholdValue),
    notificationStatus: row.notificationLogs[0]?.status ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildDashboardPayload(input: DashboardInput): DashboardPayload {
  const { days, tasks, userPrices, alerts } = input;
  const points = sortByRecordedAt(input.points);
  const newest = points[points.length - 1];

  return {
    days,
    trackedProductCount: countTrackedProducts(tasks),
    yourAveragePrice: averagePrice(userPrices),
    lastRecordedAt: newest ? newest.recordedAt.toISOString() : null,
    competitors: buildCompetitorSummaries(tasks, points),
    chart: buildPriceChart(points),
    changes: buildPriceChanges(points),
    alerts: alerts.slice(0, MAX_ALERTS).map(toDashboardAlert),
  };
}

function isPriced(point: PricePoint): point is PricedPoint {
  return point.price !== null;
}

function isMoved(point: PricePoint): point is MovedPoint {
  return (
    isPriced(point) &&
    point.previousPrice !== null &&
    point.changePercentage !== null &&
    point.changePercentage !== 0
  );
}

function isNonZeroChange(point: PricePoint): boolean {
  return point.changePercentage !== null && point.changePercentage !== 0;
}

function sortByRecordedAt<T extends { recordedAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}
