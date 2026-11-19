import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { z } from 'zod';
import {
  getPriceHistory,
  getPriceHistoryInRange,
  getMonitoringTaskById,
} from '~/server/db/queries/monitoring';

const priceHistorySchema = z.object({
  monitoringTaskId: z.string(),
  productUrl: z.string().optional(),
  limit: z.number().min(1).max(1000).default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryParams = {
      monitoringTaskId: searchParams.get('monitoringTaskId'),
      productUrl: searchParams.get('productUrl') ?? undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
    };

    const result = priceHistorySchema.safeParse(queryParams);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: result.error.format() },
        { status: 400 }
      );
    }

    const { monitoringTaskId, productUrl, limit, startDate, endDate } = result.data;

    // Verify the monitoring task belongs to the user
    const task = await getMonitoringTaskById(monitoringTaskId);
    if (!task || task.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Monitoring task not found or access denied' },
        { status: 404 }
      );
    }

    let priceHistory;
    
    if (startDate && endDate) {
      // Get price history within date range
      priceHistory = await getPriceHistoryInRange(
        monitoringTaskId,
        new Date(startDate),
        new Date(endDate),
        productUrl
      );
    } else {
      // Get recent price history
      priceHistory = await getPriceHistory(monitoringTaskId, productUrl, limit);
    }

    // Transform the data for frontend consumption
    const transformedHistory = priceHistory.map(record => ({
      id: record.id,
      productName: record.productName,
      productUrl: record.productUrl,
      price: record.price ? parseFloat(record.price) : null,
      currency: record.currency,
      recordedAt: record.recordedAt,
      changePercentage: record.changePercentage ? parseFloat(record.changePercentage) : null,
      previousPrice: record.previousPrice ? parseFloat(record.previousPrice) : null,
      extractionMethod: record.extractionMethod,
    }));

    return NextResponse.json({
      priceHistory: transformedHistory,
      task: {
        id: task.id,
        competitorDomain: task.competitorDomain,
        frequency: task.frequency,
        enabled: task.enabled,
        status: task.status,
      },
    });
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
} 