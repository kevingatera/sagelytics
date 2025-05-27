import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';
import type { Product } from '@shared/types';

const monitorRequestSchema = z.object({
  competitorDomain: z.string(),
  productIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
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
    
    const { competitorDomain, productIds } = result.data;

    // Get user products
    const onboardingData = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, session.user.id),
    });

    if (!onboardingData) {
      return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
    }

    if (!onboardingData.productCatalogUrl) {
      return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
    }

    // Get user product data
    const productCatalogContent = await MicroserviceClient.getInstance().discoverWebsiteContent(
      onboardingData.productCatalogUrl
    );

    // Filter products if productIds is provided and map to Product type
    const userProducts: Product[] = (productIds && productIds.length > 0
      ? productCatalogContent.products.filter(p => productIds.includes(p.name))
      : productCatalogContent.products
    ).map(p => ({
      name: p.name,
      description: p.description ?? undefined,
      url: p.url ?? undefined,
      price: p.price ?? undefined,
      currency: p.currency ?? undefined,
    }));

    // Monitor competitor prices
    const monitorData = await MicroserviceClient.getInstance().monitorCompetitorPrices({
      competitorDomain,
      userProducts,
    });

    return NextResponse.json({
      success: true,
      matches: monitorData,
    });

  } catch (error: unknown) {
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
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const url = new URL(req.url);
    const productUrl = url.searchParams.get('productUrl');
    
    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl parameter is required' }, { status: 400 });
    }
    
    const priceHistory = await MicroserviceClient.getInstance().trackPriceHistory(productUrl);
    
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