import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, users, competitors, userCompetitors } from '~/server/db/schema';
import { z } from 'zod';

import { eq } from 'drizzle-orm';
import { progressService } from '~/lib/services/progress-service';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { createMonitoringTask } from '~/server/db/queries/monitoring';

const optionalUrl = z.preprocess(
  (a) => (typeof a === 'string' && a.trim() === '' ? undefined : a),
  z.string().url().optional(),
);

const onboardingSchema = z.object({
  companyDomain: z.string().url(),
  productCatalog: z.string().url().optional().or(z.literal('')),
  competitor1: z.string().optional().default(''),
  competitor2: z.string().optional().default(''),
  competitor3: z.string().optional().default(''),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const data = onboardingSchema.parse(body);

    // Generate session ID for progress tracking
    const sessionId = `${session.user.id}_${Date.now()}`;

    // Initialize progress tracking
    await progressService.setProgress(
      sessionId,
      'initialization',
      5,
      'Starting setup process...',
      180 // More realistic 3 minutes based on logs
    );

    // Collect known competitors from the form
    const knownCompetitors = [data.competitor1, data.competitor2, data.competitor3]
      .filter((comp): comp is string => comp !== undefined && comp !== '');

    await progressService.setProgress(
      sessionId,
      'saving_data',
      10,
      'Saving your business information...',
      170
    );

    // Check if onboarding record already exists
    const existingOnboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, session.user.id),
    });

    if (existingOnboarding) {
      // Update existing record
      await db.update(userOnboarding)
        .set({
          companyDomain: data.companyDomain,
          productCatalogUrl: data.productCatalog ?? null,
          businessType: data.businessType,
          identifiedCompetitors: knownCompetitors,
          completed: false, // Will be set to true after competitor discovery
        })
        .where(eq(userOnboarding.userId, session.user.id));
    } else {
      // Create new onboarding record
      await db.insert(userOnboarding).values({
        id: `onboarding_${session.user.id}_${Date.now()}`,
        userId: session.user.id,
        companyDomain: data.companyDomain,
        productCatalogUrl: data.productCatalog ?? null,
        businessType: data.businessType,
        identifiedCompetitors: knownCompetitors,
        completed: false, // Will be set to true after competitor discovery
      });
    }

    await progressService.setProgress(
      sessionId,
      'starting_analysis',
      15,
      'Connecting to analysis service...',
      160
    );

    // Start competitor discovery in background if competitors are provided
    if (knownCompetitors.length > 0) {
      // Trigger competitor discovery using microservice client
      void (async () => {
        try {
          await progressService.setProgress(
            sessionId,
            'analyzing_domain',
            20,
            `Analyzing your domain: ${data.companyDomain}...`,
            150
          );

          await progressService.setProgress(
            sessionId,
            'fetching_website',
            25,
            'Fetching website content...',
            140
          );

          await progressService.setProgress(
            sessionId,
            'analyzing_products',
            35,
            'Analyzing product catalog and extracting information...',
            120
          );

          // The actual competitor discovery happens here
          const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
            domain: data.companyDomain,
            userId: session.user.id,
            businessType: data.businessType,
            knownCompetitors,
            productCatalogUrl: data.productCatalog ?? '',
          });

          await progressService.setProgress(
            sessionId,
            'discovering_competitors',
            60,
            `Discovering competitors with AI...`,
            80
          );

          await progressService.setProgress(
            sessionId,
            'analyzing_competitors',
            75,
            `Analyzing competitor data...`,
            50
          );

          await progressService.setProgress(
            sessionId,
            'processing_results',
            85,
            `Processing ${discoveryResult.competitors.length} competitors and ${discoveryResult.userProducts?.length ?? 0} products...`,
            30
          );

          await progressService.setProgress(
            sessionId,
            'storing_competitors',
            90,
            'Storing competitor data and setting up monitoring...',
            20
          );

          // Store competitors in database with business names and monitoring data
          for (const competitor of discoveryResult.competitors) {
            try {
              // Check if competitor already exists
              const existingCompetitor = await db.query.competitors.findFirst({
                where: eq(competitors.domain, competitor.domain),
              });

              let competitorId: string;

              if (existingCompetitor) {
                // Update existing competitor with new data
                const [updatedCompetitor] = await db.update(competitors)
                  .set({
                    metadata: {
                      matchScore: competitor.matchScore,
                      matchReasons: competitor.matchReasons,
                      suggestedApproach: competitor.suggestedApproach,
                      dataGaps: competitor.dataGaps,
                      lastAnalyzed: new Date().toISOString(),
                      businessName: competitor.businessName,
                      platforms: competitor.listingPlatforms.map(p => ({
                        platform: p.platform,
                        url: p.url,
                        metrics: {
                          rating: p.rating ?? undefined,
                          reviews: p.reviewCount ?? undefined,
                          priceRange: p.priceRange ?? undefined,
                          lastUpdated: new Date().toISOString(),
                        }
                      })),
                      products: competitor.products.map(p => ({
                        name: p.name,
                        url: p.url ?? '',
                        price: p.price ?? 0,
                        currency: p.currency ?? 'USD',
                        platform: 'website',
                        matchedProducts: p.matchedProducts,
                        lastUpdated: p.lastUpdated,
                      })),
                    },
                    updatedAt: new Date(),
                  })
                  .where(eq(competitors.id, existingCompetitor.id))
                  .returning();
                competitorId = updatedCompetitor!.id;
              } else {
                // Create new competitor
                const [newCompetitor] = await db.insert(competitors).values({
                  domain: competitor.domain,
                  metadata: {
                    matchScore: competitor.matchScore,
                    matchReasons: competitor.matchReasons,
                    suggestedApproach: competitor.suggestedApproach,
                    dataGaps: competitor.dataGaps,
                    lastAnalyzed: new Date().toISOString(),
                    businessName: competitor.businessName,
                    platforms: competitor.listingPlatforms.map(p => ({
                      platform: p.platform,
                      url: p.url,
                      metrics: {
                        rating: p.rating ?? undefined,
                        reviews: p.reviewCount ?? undefined,
                        priceRange: p.priceRange ?? undefined,
                        lastUpdated: new Date().toISOString(),
                      }
                    })),
                    products: competitor.products.map(p => ({
                      name: p.name,
                      url: p.url ?? '',
                      price: p.price ?? 0,
                      currency: p.currency ?? 'USD',
                      platform: 'website',
                      matchedProducts: p.matchedProducts,
                      lastUpdated: p.lastUpdated,
                    })),
                  },
                }).returning();
                competitorId = newCompetitor!.id;
              }

              // Link competitor to user
              await db.insert(userCompetitors).values({
                userId: session.user.id,
                competitorId,
                relationshipStrength: Math.round(competitor.matchScore / 10), // Convert 0-100 to 0-10
              }).onConflictDoNothing();

              // Create monitoring task if competitor has product URLs
              if (competitor.monitoringData?.productUrls && competitor.monitoringData.productUrls.length > 0) {
                await createMonitoringTask({
                  userId: session.user.id,
                  competitorDomain: competitor.domain,
                  productUrls: competitor.monitoringData.productUrls,
                  frequency: '0 */6 * * *', // Every 6 hours
                  enabled: true,
                  discoverySource: competitor.monitoringData.extractionMethod,
                });
              }
            } catch (error) {
              console.error(`Failed to store competitor ${competitor.domain}:`, error);
              // Continue with other competitors even if one fails
            }
          }

          await progressService.setProgress(
            sessionId,
            'finalizing',
            95,
            'Finalizing setup and saving results...',
            10
          );

          // Mark user as having completed onboarding
          await db.update(users)
            .set({ onboardingCompleted: true })
            .where(eq(users.id, session.user.id));
    
          await db.update(userOnboarding)
            .set({ 
              completed: true,
              identifiedCompetitors: discoveryResult.competitors.map((c) => 
                c.businessName ? `${c.businessName} (${c.domain})` : c.domain
              ),
            })
            .where(eq(userOnboarding.userId, session.user.id));

          await progressService.setComplete(
            sessionId,
            `Setup complete! Found ${discoveryResult.competitors.length} competitors and ${discoveryResult.userProducts?.length ?? 0} products. Redirecting to dashboard...`
          );
        } catch (error) {
          console.error('Failed to discover competitors:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          await progressService.setError(
            sessionId, 
            `Competitor analysis failed: ${errorMessage}. Please try again or contact support.`
          );
        }
      })();
    } else {
      // If no competitors provided, mark as complete
      await db.update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, session.user.id));
      
      await db.update(userOnboarding)
        .set({ completed: true })
        .where(eq(userOnboarding.userId, session.user.id));
      
      await progressService.setComplete(sessionId, 'Setup complete! You can add competitors later from the dashboard.');
    }
    
    return Response.json({ success: true, sessionId });
  } catch (error) {
    console.error('Onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid onboarding data', issues: error.issues },
        { status: 400 }
      );
    }
    
    return Response.json(
      { message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
