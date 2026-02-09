import { auth } from '~/server/auth';
import { db } from '~/server/db';
import {
  competitors,
  type CompetitorMetadata,
  userCompetitors,
  userOnboarding,
} from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';
import type { CompetitorInsight } from '@shared/types';

const schema = z.object({
  url: z.string().transform((url) => {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      throw new Error('Invalid URL');
    }
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get user's competitors
    const userCompetitorsList = await db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, session.user.id),
      with: { competitor: true },
    });

    const competitors = userCompetitorsList.map((uc) => ({
      id: uc.competitor.id,
      domain: uc.competitor.domain,
      metadata: uc.competitor.metadata,
    }));

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const domain = parsed.data.url;

  const existingOnboarding = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!existingOnboarding) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 400 });
  }

  if (!existingOnboarding.productCatalogUrl) {
    return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
  }

  try {
    const microserviceClient = MicroserviceClient.getInstance();
    const catalog = await microserviceClient.discoverWebsiteContent(
      existingOnboarding.productCatalogUrl,
    );
    const userProducts = Array.isArray(catalog.products)
      ? catalog.products.map((product) => ({
          name: product.name,
          description: product.description ?? '',
          url: product.url ?? undefined,
          price: product.price ?? undefined,
          currency: product.currency ?? undefined,
        }))
      : [];

    const competitorInsight = await microserviceClient.analyzeCompetitor({
      competitorDomain: domain,
      businessContext: {
        domain: existingOnboarding.companyDomain,
        businessType: existingOnboarding.businessType ?? '',
        products: userProducts,
      },
    });
    const typedInsight: Partial<CompetitorInsight> = competitorInsight;

    const metadata: CompetitorMetadata = {
      matchScore: typedInsight.matchScore ?? 0,
      matchReasons: typedInsight.matchReasons ?? [],
      suggestedApproach: typedInsight.suggestedApproach ?? '',
      dataGaps: typedInsight.dataGaps ?? [],
      businessName: typedInsight.businessName,
      lastAnalyzed: new Date().toISOString(),
      platforms: (typedInsight.listingPlatforms ?? []).map((platform) => ({
        platform: platform.platform,
        url: platform.url,
        metrics: {
          rating: platform.rating ?? undefined,
          reviews: platform.reviewCount ?? undefined,
          priceRange: platform.priceRange
            ? {
                min: platform.priceRange.min,
                max: platform.priceRange.max,
                currency: platform.priceRange.currency,
              }
            : undefined,
          lastUpdated: new Date().toISOString(),
        },
      })),
      products: (typedInsight.products ?? []).map((product) => ({
        name: product.name ?? '',
        url: product.url ?? '',
        price: product.price ?? 0,
        currency: product.currency ?? 'USD',
        platform: 'unknown',
        matchedProducts: (product.matchedProducts ?? []).map((match) => ({
          name: match.name ?? '',
          url: match.url ?? null,
          matchScore: match.matchScore ?? 0,
          priceDiff: match.priceDiff ?? null,
        })),
        lastUpdated: new Date().toISOString(),
      })),
    };

    const [upsertedCompetitor] = await db
      .insert(competitors)
      .values({
        domain,
        metadata,
      })
      .onConflictDoUpdate({
        target: competitors.domain,
        set: {
          metadata,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!upsertedCompetitor) {
      return NextResponse.json(
        { error: 'Failed to save competitor analysis' },
        { status: 500 },
      );
    }

    await db
      .insert(userCompetitors)
      .values({
        userId: session.user.id,
        competitorId: upsertedCompetitor.id,
        relationshipStrength: Math.max(
          1,
          Math.min(5, Math.round((metadata.matchScore ?? 0) / 20)),
        ),
      })
      .onConflictDoNothing();

    return NextResponse.json({
      success: true,
      competitor: {
        id: upsertedCompetitor.id,
        domain: upsertedCompetitor.domain,
        metadata: upsertedCompetitor.metadata,
      },
    });
  } catch (error) {
    console.error('Error analyzing competitor:', error);
    return NextResponse.json(
      { error: 'Failed to analyze competitor' },
      { status: 500 },
    );
  }
}
