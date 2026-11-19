import { NextResponse } from 'next/server';
import { auth, requireWriteSession } from '~/server/auth';
import { z } from 'zod';
import {
  createMonitoringTask,
  getMonitoringTasksByUser,
  updateMonitoringTask,
  deleteMonitoringTask,
} from '~/server/db/queries/monitoring';
import { isBillingLimitError, reserveMonitoredProducts } from '~/server/billing';
import { withMonitoringCapacity } from '~/server/monitoring/reservation';
import { monitoringTasks } from '~/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { MONITORABLE_URL_MESSAGE, toMonitorableUrl } from './product-url';

const monitorableUrl = z.string().transform((value, ctx) => {
  const url = toMonitorableUrl(value);
  if (!url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: MONITORABLE_URL_MESSAGE });
    return z.NEVER;
  }
  return url;
});

const productUrlSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: monitorableUrl,
  price: z.number().optional(),
  currency: z.string().optional(),
});

const createTaskSchema = z.object({
  competitorDomain: z.string().min(1, 'Competitor domain is required'),
  productUrls: z.array(productUrlSchema).min(1, 'At least one product URL is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  enabled: z.boolean().default(true),
  discoverySource: z.string().default('perplexity'),
});

const updateTaskSchema = z.object({
  taskId: z.string(),
  enabled: z.boolean().optional(),
  frequency: z.string().optional(),
  productUrls: z.array(productUrlSchema).optional(),
  status: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await getMonitoringTasksByUser(session.user.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch monitoring tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring tasks' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const write = await requireWriteSession();
  if (!write.ok) return write.response;
  const session = write.session;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createTaskSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    const { competitorDomain, productUrls, frequency, enabled, discoverySource } = result.data;

    const userId = session.user.id;
    const { result: task } = await reserveMonitoredProducts(userId, productUrls.length, (tx) =>
      createMonitoringTask({ userId, competitorDomain, productUrls, frequency, enabled, discoverySource }, tx),
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (isBillingLimitError(error)) return NextResponse.json(error.toJSON(), { status: 402 });
    console.error('Failed to create monitoring task:', error);
    return NextResponse.json(
      { error: 'Failed to create monitoring task' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const write = await requireWriteSession();
  if (!write.ok) return write.response;
  const session = write.session;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = updateTaskSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }

    const { taskId, ...updates } = result.data;

    const userId = session.user.id;
    const task = await withMonitoringCapacity(userId, async (tx, billing) => {
      if (updates.productUrls) {
        const existing = await tx.query.monitoringTasks.findFirst({
          where: and(eq(monitoringTasks.id, taskId), eq(monitoringTasks.userId, userId)),
          columns: { productUrls: true },
        });
        if (!existing) return undefined;

        const added = updates.productUrls.length - existing.productUrls.length;
        if (added > 0) await billing.assertCanMonitorProducts(userId, added);
      }
      return updateMonitoringTask(taskId, userId, updates, tx);
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Monitoring task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    if (isBillingLimitError(error)) return NextResponse.json(error.toJSON(), { status: 402 });
    console.error('Failed to update monitoring task:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring task' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const write = await requireWriteSession();
  if (!write.ok) return write.response;
  const session = write.session;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const { result: deleted } = await reserveMonitoredProducts(userId, 0, (tx) =>
      deleteMonitoringTask(taskId, userId, tx),
    );

    if (!deleted) {
      return NextResponse.json(
        { error: 'Monitoring task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete monitoring task:', error);
    return NextResponse.json(
      { error: 'Failed to delete monitoring task' },
      { status: 500 }
    );
  }
} 