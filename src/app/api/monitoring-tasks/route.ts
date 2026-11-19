import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { z } from 'zod';
import {
  createMonitoringTask,
  getMonitoringTasksByUser,
  updateMonitoringTask,
  deleteMonitoringTask,
} from '~/server/db/queries/monitoring';
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
  const session = await auth();
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

    const task = await createMonitoringTask({
      userId: session.user.id,
      competitorDomain,
      productUrls,
      frequency,
      enabled,
      discoverySource,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create monitoring task:', error);
    return NextResponse.json(
      { error: 'Failed to create monitoring task' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();
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

    const task = await updateMonitoringTask(taskId, session.user.id, updates);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Monitoring task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to update monitoring task:', error);
    return NextResponse.json(
      { error: 'Failed to update monitoring task' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
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

    const deleted = await deleteMonitoringTask(taskId, session.user.id);

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