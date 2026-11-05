import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, userProducts, users } from '~/server/db/schema';
import { persistCompetitorForUser } from '~/server/db/competitor-analysis';
import { createCompetitorAnalysisStore } from '~/server/db/queries/competitor-analysis';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { progressService } from '~/lib/services/progress-service';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Extract sessionId from query params
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  const onboardingData = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!onboardingData) {
    if (sessionId) {
      await progressService.setError(sessionId, 'Onboarding data not found');
    }
    return NextResponse.json({ error: 'Onboarding not completed' }, { status: 400 });
  }

  if (!onboardingData.productCatalogUrl) {
    if (sessionId) {
      await progressService.setError(sessionId, 'Product catalog URL is required');
    }
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

  if (sessionId) {
    await progressService.setProgress(
      sessionId,
      'analyzing_domain',
      35,
      `Analyzing ${onboardingData.companyDomain} and your ${onboardingData.businessType} business...`,
      60
    );
  }

  const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: onboardingData.companyDomain,
    userId: session.user.id,
    businessType: onboardingData.businessType,
    knownCompetitors,
    productCatalogUrl: onboardingData.productCatalogUrl,
  });

  if (sessionId) {
    await progressService.setProgress(
      sessionId,
      'processing_results',
      70,
      `Found ${discoveryResult.competitors.length} competitors. Analyzing products...`,
      30
    );
  }

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
      // Public facts go to the shared row; this user's analysis is stored per user
      await persistCompetitorForUser(createCompetitorAnalysisStore(db), {
        userId: session.user.id,
        domain: competitorInsight.domain,
        insight: competitorInsight,
        relationshipStrength: Math.max(
          1,
          Math.min(5, Math.round((competitorInsight.matchScore ?? 0) / 20)),
        ),
      });
      savedCompetitors.push(competitorInsight.domain);
    } catch (error) {
      console.error(`Failed to save competitor ${competitorInsight.domain}:`, error);
    }
  }

  if (sessionId) {
    await progressService.setProgress(
      sessionId,
      'finalizing',
      90,
      'Finalizing setup...',
      10
    );
  }

  // Update the userOnboarding table with all competitor domains
  await db
    .update(userOnboarding)
    .set({
      identifiedCompetitors: discoveryResult.competitors.map((c) => c.domain),
      completed: true,
    })
    .where(eq(userOnboarding.userId, session.user.id));

  // Mark user as having completed onboarding
  await db.update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, session.user.id));

  if (sessionId) {
    await progressService.setComplete(
      sessionId,
      `Setup complete! Found ${discoveryResult.competitors.length} competitors and ${discoveryResult.userProducts?.length ?? 0} products.`
    );
  }

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
