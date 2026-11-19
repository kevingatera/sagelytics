import { NextResponse } from 'next/server';
import { auth, requireWriteSession } from '~/server/auth';
import { db } from '~/server/db';
import { userCompetitors, userOnboarding } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';
import { getStoredCatalog, loadCatalog } from '~/server/monitoring/catalog';
import { PaidWorkLimitError, runPaidWork } from '~/server/monitoring/paid-work';

const monitorRequestSchema = z.object({
  competitorDomain: z.string(),
  productIds: z.array(z.string()).optional(),
});

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./, '');
  } catch {
    return '';
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
    // Validate request body
    const body = await req.json();
    const result = monitorRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { productIds } = result.data;
    const competitorDomain = normalizeDomain(result.data.competitorDomain);

    // Only competitors this user has linked can be crawled through this route.
    const linked = await db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, session.user.id),
      with: { competitor: { columns: { domain: true } } },
    });
    if (!competitorDomain || !linked.some((uc) => normalizeDomain(uc.competitor.domain) === competitorDomain)) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Get user products
    const onboardingData = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, session.user.id),
    });

    if (!onboardingData) {
      return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
    }

    const stored = await getStoredCatalog(db, session.user.id);
    if (!stored.length && !onboardingData.productCatalogUrl) {
      return NextResponse.json(
        { error: 'Add your products, or a page that lists your prices, first' },
        { status: 400 },
      );
    }
    const monitorData = await runPaidWork(session.user.id, 'product-monitor', async (deadlineAt) => {
      const products = await loadCatalog(stored, onboardingData.productCatalogUrl, deadlineAt);
      const userProducts = productIds?.length
        ? products.filter((product) => productIds.includes(product.name))
        : products;
      return MicroserviceClient.getInstance().monitorCompetitorPrices({
        competitorDomain,
        userProducts,
      }, deadlineAt);
    });

    return NextResponse.json({
      success: true,
      matches: monitorData,
    });

  } catch (error: unknown) {
    if (error instanceof PaidWorkLimitError) {
      return NextResponse.json({ error: error.message }, {
        status: 429,
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      });
    }
    console.error('Error monitoring competitor prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to monitor competitor prices', message: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const url = new URL(req.url);
    const productUrl = url.searchParams.get('productUrl');
    
    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl parameter is required' }, { status: 400 });
    }
    
    // Scoped to the caller's own monitoring tasks. A URL another user monitors returns
    // the same empty history as an unknown URL, so URLs cannot be probed.
    const priceHistory = await MicroserviceClient.getInstance().trackPriceHistory(
      session.user.id,
      productUrl,
    );
    
    return NextResponse.json({
      success: true,
      history: priceHistory,
    });
    
  } catch (error: unknown) {
    console.error('Error tracking price history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to track price history', message: errorMessage },
      { status: 500 }
    );
  }
} 