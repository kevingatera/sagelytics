import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, users, competitors, userCompetitors, userProducts } from '~/server/db/schema';
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
    console.log('[API-Onboarding] Request received at:', new Date().toISOString());
    
    const session = await auth();
    
    if (!session?.user?.id) {
      console.error('❌ [API-Onboarding] Authentication required - no session found');
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('[API-Onboarding] User authenticated:', {
      userId: session.user.id,
      email: session.user.email
    });
    
    const body = await req.json();
    console.log('[API-Onboarding] Request body received:', {
      companyDomain: body.companyDomain,
      businessType: body.businessType,
      hasCatalog: !!body.productCatalog,
      competitorCount: [body.competitor1, body.competitor2, body.competitor3].filter(Boolean).length
    });
    
    const data = onboardingSchema.parse(body);
    console.log('[API-Onboarding] Schema validation passed');

    // Generate session ID for progress tracking
    const sessionId = `${session.user.id}_${Date.now()}`;
    console.log('[API-Onboarding] Generated session ID:', sessionId);

    // Initialize progress tracking
    await progressService.setProgress(
      sessionId,
      'initialization',
      5,
      'Starting setup process...',
      180 // More realistic 3 minutes based on logs
    );
    console.log('[API-Onboarding] Progress tracking initialized');

    // Collect known competitors from the form
    const knownCompetitors = [data.competitor1, data.competitor2, data.competitor3]
      .filter((comp): comp is string => comp !== undefined && comp !== '');
    
    console.log('[API-Onboarding] Known competitors collected:', {
      count: knownCompetitors.length,
      competitors: knownCompetitors
    });

    await progressService.setProgress(
      sessionId,
      'saving_data',
      10,
      'Saving your business information...',
      170
    );

    // Check if onboarding record already exists
    console.log('[API-Onboarding] Checking for existing onboarding record for user:', session.user.id);
    const existingOnboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, session.user.id),
    });

    if (existingOnboarding) {
      console.log('[API-Onboarding] Updating existing onboarding record:', existingOnboarding.id);
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
      console.log('[API-Onboarding] Onboarding record updated successfully');
    } else {
      console.log('[API-Onboarding] Creating new onboarding record');
      // Create new onboarding record
      const newOnboardingId = `onboarding_${session.user.id}_${Date.now()}`;
      await db.insert(userOnboarding).values({
        id: newOnboardingId,
        userId: session.user.id,
        companyDomain: data.companyDomain,
        productCatalogUrl: data.productCatalog ?? null,
        businessType: data.businessType,
        identifiedCompetitors: knownCompetitors,
        completed: false, // Will be set to true after competitor discovery
      });
      console.log('[API-Onboarding] New onboarding record created:', newOnboardingId);
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
      console.log('[API-Onboarding] Starting background competitor discovery with competitors:', knownCompetitors);
      // Trigger competitor discovery using microservice client
      void (async () => {
        try {
          console.log('[API-Onboarding] Step: analyzing_domain');
          await progressService.setProgress(
            sessionId,
            'analyzing_domain',
            20,
            `Analyzing your domain: ${data.companyDomain}...`,
            150
          );

          console.log('[API-Onboarding] Step: fetching_website');
          await progressService.setProgress(
            sessionId,
            'fetching_website',
            25,
            'Fetching website content...',
            140
          );

          console.log('[API-Onboarding] Step: analyzing_products');
          await progressService.setProgress(
            sessionId,
            'analyzing_products',
            35,
            'Analyzing product catalog and extracting information...',
            120
          );

          console.log('[API-Onboarding] Calling microservice for competitor discovery:', {
            domain: data.companyDomain,
            userId: session.user.id,
            businessType: data.businessType,
            knownCompetitors,
            productCatalogUrl: data.productCatalog ?? ''
          });

          // The actual competitor discovery happens here
          const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
            domain: data.companyDomain,
            userId: session.user.id,
            businessType: data.businessType,
            knownCompetitors,
            productCatalogUrl: data.productCatalog ?? '',
          });

          console.log('[API-Onboarding] Microservice discovery completed:', {
            competitorCount: discoveryResult.competitors.length,
            userProductCount: discoveryResult.userProducts?.length ?? 0,
            competitorDomains: discoveryResult.competitors.map(c => c.domain)
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

          console.log('[API-Onboarding] Starting competitor storage process');

          // Store user products discovered during analysis
          if (discoveryResult.userProducts && discoveryResult.userProducts.length > 0) {
            console.log(`[API-Onboarding] Storing ${discoveryResult.userProducts.length} user products discovered during analysis`);

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

                console.log(`[API-Onboarding] Stored user product: ${userProduct.name} with SKU: ${sku}`);
              } catch (error) {
                console.warn(`[API-Onboarding] Failed to store user product "${userProduct.name}":`, error);
              }
            }
          }

          // Store competitors in database with business names and monitoring data
          for (const competitor of discoveryResult.competitors) {
            try {
              console.log('[API-Onboarding] Processing competitor:', {
                domain: competitor.domain,
                businessName: competitor.businessName,
                productCount: competitor.products?.length ?? 0,
                matchScore: competitor.matchScore
              });

              // Check if competitor already exists
              const existingCompetitor = await db.query.competitors.findFirst({
                where: eq(competitors.domain, competitor.domain),
              });

              let competitorId: string;

              if (existingCompetitor) {
                console.log('[API-Onboarding] Updating existing competitor:', existingCompetitor.id);
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
                console.log('[API-Onboarding] Competitor updated successfully');
              } else {
                console.log('[API-Onboarding] Creating new competitor');
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
                console.log('[API-Onboarding] New competitor created:', competitorId);
              }

              console.log('[API-Onboarding] Linking competitor to user:', {
                userId: session.user.id,
                competitorId,
                relationshipStrength: Math.round(competitor.matchScore / 10)
              });

              // Link competitor to user
              await db.insert(userCompetitors).values({
                userId: session.user.id,
                competitorId,
                relationshipStrength: Math.round(competitor.matchScore / 10), // Convert 0-100 to 0-10
              }).onConflictDoNothing();

              // Create monitoring task if competitor has product URLs
              if (competitor.monitoringData?.productUrls && competitor.monitoringData.productUrls.length > 0) {
                console.log('[API-Onboarding] Creating monitoring task for competitor:', {
                  domain: competitor.domain,
                  productUrlCount: competitor.monitoringData.productUrls.length,
                  extractionMethod: competitor.monitoringData.extractionMethod
                });

                await createMonitoringTask({
                  userId: session.user.id,
                  competitorDomain: competitor.domain,
                  productUrls: competitor.monitoringData.productUrls,
                  frequency: '0 */6 * * *', // Every 6 hours
                  enabled: true,
                  discoverySource: competitor.monitoringData.extractionMethod,
                });
                console.log('[API-Onboarding] Monitoring task created successfully');
              } else {
                console.log('[API-Onboarding] No product URLs found for monitoring:', competitor.domain);
              }
            } catch (error) {
              console.error(`❌ [API-Onboarding] Failed to store competitor ${competitor.domain}:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
              });
              // Continue with other competitors even if one fails
            }
          }

          console.log('[API-Onboarding] Finalizing onboarding process');
          await progressService.setProgress(
            sessionId,
            'finalizing',
            95,
            'Finalizing setup and saving results...',
            10
          );

          console.log('[API-Onboarding] Marking user as onboarded');
          // Mark user as having completed onboarding
          await db.update(users)
            .set({ onboardingCompleted: true })
            .where(eq(users.id, session.user.id));
    
          const competitorNames = discoveryResult.competitors.map((c) => 
            c.businessName ? `${c.businessName} (${c.domain})` : c.domain
          );

          console.log('[API-Onboarding] Updating onboarding record with completion data:', {
            competitorCount: discoveryResult.competitors.length,
            competitorNames
          });

          await db.update(userOnboarding)
            .set({ 
              completed: true,
              identifiedCompetitors: competitorNames,
            })
            .where(eq(userOnboarding.userId, session.user.id));

          const completionMessage = `Setup complete! Found ${discoveryResult.competitors.length} competitors and ${discoveryResult.userProducts?.length ?? 0} products. Redirecting to dashboard...`;
          console.log('[API-Onboarding] Onboarding completed successfully:', completionMessage);

          await progressService.setComplete(sessionId, completionMessage);
        } catch (error) {
          console.error('[API-Onboarding] Failed to discover competitors:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            sessionId,
            timestamp: new Date().toISOString()
          });
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          await progressService.setError(
            sessionId, 
            `Competitor analysis failed: ${errorMessage}. Please try again or contact support.`
          );
        }
      })();
    } else {
      console.log('[API-Onboarding] No competitors provided, completing onboarding immediately');
      // If no competitors provided, mark as complete
      await db.update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, session.user.id));
      
      await db.update(userOnboarding)
        .set({ completed: true })
        .where(eq(userOnboarding.userId, session.user.id));
      
      await progressService.setComplete(sessionId, 'Setup complete! You can add competitors later from the dashboard.');
      console.log('[API-Onboarding] Quick onboarding completed without competitor analysis');
    }
    
    console.log('[API-Onboarding] Request completed successfully:', { sessionId });
    return Response.json({ success: true, sessionId });
  } catch (error) {
    console.error('[API-Onboarding] Request failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof z.ZodError) {
      console.error('❌ [API-Onboarding] Schema validation failed:', error.issues);
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
