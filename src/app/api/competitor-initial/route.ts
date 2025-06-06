import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, competitors, userCompetitors, userProducts, type CompetitorMetadata } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const onboardingData = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!onboardingData) {
    return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
  }

  if (!onboardingData.productCatalogUrl) {
    return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
  }

  // Parse identifiedCompetitors - it's stored as comma-separated string in DB
  const rawCompetitors = onboardingData.identifiedCompetitors as string[] | string | null | undefined;
  let knownCompetitors: string[] = [];
  if (Array.isArray(rawCompetitors)) {
    knownCompetitors = rawCompetitors;
  } else if (typeof rawCompetitors === 'string' && rawCompetitors.length > 0) {
    knownCompetitors = rawCompetitors.split(',').map((c: string) => c.trim());
  }
  console.log('Parsed knownCompetitors:', knownCompetitors);

  const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: onboardingData.companyDomain,
    userId: session.user.id,
    businessType: onboardingData.businessType,
    knownCompetitors,
    productCatalogUrl: onboardingData.productCatalogUrl,
  });

  // Store user products discovered during the process
  if (discoveryResult.userProducts && discoveryResult.userProducts.length > 0) {
    console.log(`Storing ${discoveryResult.userProducts.length} user products discovered during analysis`);

    for (const userProduct of discoveryResult.userProducts) {
      try {
        // Generate consistent SKU based on product name to allow proper deduplication
        const baseSku = userProduct.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 15) ?? 'UNKNOWN';
        const sku = `${baseSku}-${Math.abs(userProduct.name?.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0) ?? 0) % 1000}`.slice(0, 20);

        // Insert or update user product
        await db
          .insert(userProducts)
          .values({
            userId: session.user.id,
            name: userProduct.name ?? 'Unknown Product',
            sku: sku,
            price: userProduct.price?.toString() ?? '0',
            category: 'accommodation', // More appropriate category for this business type
            description: userProduct.description ?? '',
          })
          .onConflictDoUpdate({
            target: [userProducts.userId, userProducts.sku],
            set: {
              price: userProduct.price?.toString() ?? '0',
              description: userProduct.description ?? '',
              updatedAt: new Date(),
            },
          });

        console.log(`Stored user product: ${userProduct.name} with SKU: ${sku}`);
      } catch (error) {
        console.warn(`Failed to store user product "${userProduct.name}":`, error);
      }
    }
  }

  // Save each discovered competitor to the database
  const savedCompetitors = [];
  for (const competitorInsight of discoveryResult.competitors) {
    try {
      // Transform CompetitorInsight to CompetitorMetadata
      const metadata: CompetitorMetadata = {
        matchScore: competitorInsight.matchScore,
        matchReasons: competitorInsight.matchReasons,
        suggestedApproach: competitorInsight.suggestedApproach,
        dataGaps: competitorInsight.dataGaps,
        lastAnalyzed: new Date().toISOString(),
        platforms: competitorInsight.listingPlatforms.map((p) => ({
          platform: p.platform,
          url: p.url,
          metrics: {
            rating: p.rating ?? undefined,
            reviewCount: p.reviewCount ?? undefined,
            priceRange: p.priceRange
              ? {
                min: p.priceRange.min,
                max: p.priceRange.max,
                currency: p.priceRange.currency,
              }
              : undefined,
            lastUpdated: new Date().toISOString(),
          },
        })),
        products: competitorInsight.products.map((p) => ({
          name: p.name ?? '',
          url: p.url ?? '',
          price: p.price ?? 0,
          currency: p.currency ?? 'USD',
          platform: 'unknown',
          matchedProducts: p.matchedProducts.map((m) => ({
            name: m.name ?? '',
            url: m.url ?? '',
            matchScore: m.matchScore ?? 0,
            priceDiff: m.priceDiff ?? null,
          })),
          lastUpdated: new Date().toISOString(),
        })),
      };

      // Insert or update competitor
      const competitorRecords = await db
        .insert(competitors)
        .values({
          domain: competitorInsight.domain,
          metadata,
        })
        .onConflictDoUpdate({
          target: competitors.domain,
          set: { metadata },
        })
        .returning();

      const competitor = competitorRecords[0];
      if (competitor) {
        // Link competitor to user
        await db
          .insert(userCompetitors)
          .values({
            userId: session.user.id,
            competitorId: competitor.id,
            relationshipStrength: Math.round(competitorInsight.matchScore * 5),
          })
          .onConflictDoNothing();

        savedCompetitors.push(competitor.domain);
      }
    } catch (error) {
      console.error(`Failed to save competitor ${competitorInsight.domain}:`, error);
    }
  }

  // Update the userOnboarding table with all competitor domains
  await db
    .update(userOnboarding)
    .set({
      identifiedCompetitors: discoveryResult.competitors.map((c) => c.domain),
      completed: true,
    })
    .where(eq(userOnboarding.userId, session.user.id));

  return NextResponse.json({
    success: true,
    competitors: discoveryResult,
    savedCompetitors,
    stats: {
      discovered: discoveryResult.competitors.length,
      saved: savedCompetitors.length,
      userProducts: discoveryResult.userProducts?.length ?? 0,
    },
  });
}
