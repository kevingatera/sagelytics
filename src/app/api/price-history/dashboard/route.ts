import { NextResponse } from 'next/server';
import { and, asc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { monitoringTasks, priceHistory, userProducts } from '~/server/db/schema';
import { getAlertsByUser } from '~/server/db/queries/monitoring';
import {
  DAY_MS,
  DEFAULT_RANGE_DAYS,
  MAX_RANGE_DAYS,
  buildDashboardPayload,
  toNumber,
  type PricePoint,
} from './summary';

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(MAX_RANGE_DAYS).default(DEFAULT_RANGE_DAYS),
});

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = querySchema.safeParse({ days: searchParams.get('days') ?? undefined });
  if (!query.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { days } = query.data;
  const since = new Date(Date.now() - days * DAY_MS);

  try {
    const [tasks, rows, prices, alerts] = await Promise.all([
      db.query.monitoringTasks.findMany({
        where: eq(monitoringTasks.userId, userId),
        columns: { competitorDomain: true, productUrls: true },
      }),
      db
        .select({
          recordedAt: priceHistory.recordedAt,
          competitorDomain: monitoringTasks.competitorDomain,
          productUrl: priceHistory.productUrl,
          productName: priceHistory.productName,
          price: priceHistory.price,
          currency: priceHistory.currency,
          changePercentage: priceHistory.changePercentage,
          previousPrice: priceHistory.previousPrice,
        })
        .from(priceHistory)
        .innerJoin(monitoringTasks, eq(priceHistory.monitoringTaskId, monitoringTasks.id))
        .where(and(eq(monitoringTasks.userId, userId), gte(priceHistory.recordedAt, since)))
        .orderBy(asc(priceHistory.recordedAt)),
      db
        .select({ price: userProducts.price })
        .from(userProducts)
        .where(eq(userProducts.userId, userId)),
      getAlertsByUser(userId),
    ]);

    const points: PricePoint[] = rows.map((row) => ({
      recordedAt: row.recordedAt,
      competitorDomain: row.competitorDomain,
      productUrl: row.productUrl,
      productName: row.productName,
      price: toNumber(row.price),
      currency: row.currency,
      changePercentage: toNumber(row.changePercentage),
      previousPrice: toNumber(row.previousPrice),
    }));

    const payload = buildDashboardPayload({
      days,
      tasks,
      points,
      userPrices: prices.flatMap((row) => toNumber(row.price) ?? []),
      alerts,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to build price dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to load price dashboard' },
      { status: 500 },
    );
  }
}
