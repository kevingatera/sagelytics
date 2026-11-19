import { randomUUID } from 'node:crypto';
import { requireWriteSession } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, users, userProducts } from '~/server/db/schema';
import { z } from 'zod';

import { eq } from 'drizzle-orm';
import { progressService } from '~/lib/services/progress-service';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { createMonitoringTask } from '~/server/db/queries/monitoring';
import { withMonitoringCapacity } from '~/server/monitoring/reservation';
import {
  isBillingLimitError,
  recordDiscoveryUsage,
  releaseDiscoveryUsage,
} from '~/server/billing';
import { BILLING_LIMIT_CODE, billingLimitMessage } from '~/lib/billing/limit-message';
import { createCompetitorAnalysisStore } from '~/server/db/queries/competitor-analysis';
import { persistCompetitorForUser } from '~/server/db/competitor-analysis';
import { resolveProductCategory } from '~/lib/onboarding/product-category';
import {
  isMarketplaceStorefrontUrl,
  MARKETPLACE_STOREFRONT_MESSAGE,
} from '~/lib/onboarding/business-domain';
import { monitorableEntries } from '~/app/api/monitoring-tasks/product-url';

const competitorStore = createCompetitorAnalysisStore(db);

const optionalUrl = z.preprocess(
  (a) => (typeof a === 'string' && a.trim() === '' ? undefined : a),
  z.string().url().optional(),
);

const onboardingSchema = z.object({
  companyDomain: z
    .string()
    .url()
    .refine((value) => !isMarketplaceStorefrontUrl(value), {
      message: MARKETPLACE_STOREFRONT_MESSAGE,
    }),
  productCatalog: optionalUrl,
  competitor1: z.string().optional().default(''),
  competitor2: z.string().optional().default(''),
  competitor3: z.string().optional().default(''),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
});

export async function POST(req: Request) {
  let claimedJob: { userId: string; domainKey: string; sessionId: string } | null = null;
  // Set once a discovery is reserved; refunded if the request fails before the run starts.
  let reservation: { userId: string; usageId: string } | null = null;
  try {
    console.log('[API-Onboarding] Request received at:', new Date().toISOString());
    
    const write = await requireWriteSession();
    if (!write.ok) return write.response;
    const session = write.session;
    
    console.log('[API-Onboarding] Session details:', {
      sessionExists: !!session,
      userExists: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : null,
      userKeys: session?.user ? Object.keys(session.user) : null
    });
    
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
    
    // Ensure the user exists in the database (can happen if OAuth user signs in for the first
    // time and the adapter failed to persist or was not yet enabled).
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!userRecord) {
      console.warn('[API-Onboarding] No user record found for session user. Creating placeholder user record.');
      await db.insert(users).values({
        id: session.user.id,
        email: session.user.email ?? '',
        name: session.user.name ?? '',
        onboardingCompleted: false,
      });
      console.log('[API-Onboarding] Placeholder user created for id:', session.user.id);
    }
    
    const body = await req.json();
    console.log('[API-Onboarding] Request body received:', {
      companyDomain: body.companyDomain,
      businessType: body.businessType,
      hasCatalog: !!body.productCatalog,
      competitorCount: [body.competitor1, body.competitor2, body.competitor3].filter(Boolean).length
    });
    
    const data = onboardingSchema.parse(body);
    console.log('[API-Onboarding] Schema validation passed');

    // The server picks an unguessable id and binds it to this user. Nobody else can claim it.
    const sessionId = randomUUID();
    if (!(await progressService.claimSession(sessionId, session.user.id))) {
      throw new Error('Could not bind a new progress session to the user');
    }
    // A double submit for the same user and domain reuses the job that is already running.
    const domainKey = new URL(data.companyDomain).hostname.toLowerCase();
    const job = await progressService.claimOnboardingJob(session.user.id, domainKey, sessionId);
    if (!job.claimed) {
      console.log('[API-Onboarding] Reusing in-flight onboarding job:', job.sessionId);
      return Response.json({ success: true, sessionId: job.sessionId, reused: true });
    }
    claimedJob = { userId: session.user.id, domainKey, sessionId };

    // Reserve the discovery after the claim, so a double submit reuses the running job
    // instead of spending (or being refused) a second allowance.
    try {
      const { usageId } = await recordDiscoveryUsage(session.user.id, sessionId);
      reservation = { userId: session.user.id, usageId };
    } catch (error) {
      if (isBillingLimitError(error)) {
        console.warn('[API-Onboarding] Discovery allowance used up:', {
          userId: session.user.id,
          used: error.used,
          limit: error.limit,
        });
        // Mark the session terminal so nothing treats it as running.
        await progressService.setError(sessionId, billingLimitMessage(error), BILLING_LIMIT_CODE);
        await progressService.releaseOnboardingJob(session.user.id, domainKey, sessionId);
        claimedJob = null;
        return Response.json(error.toJSON(), { status: 402 });
      }
      throw error;
    }
    const { usageId } = reservation;

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

    // Always start competitor discovery in the background (even if user provided none)
    console.log('[API-Onboarding] Starting background competitor discovery',
      knownCompetitors.length > 0
        ? `with competitors: ${knownCompetitors.join(', ')}`
        : 'with no predefined competitors');

    // From here the background run owns the reservation and refunds it if discovery fails.
    reservation = null;

    // Trigger competitor discovery using microservice client
    void (async () => {
      let discoveryReturned = false;
      try {
        console.log('[API-Onboarding] Starting competitor discovery process');
        await progressService.setProgress(
          sessionId,
          'starting_discovery',
          30,
          'Starting competitor discovery process...',
          130
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
          sessionId,
        });
        // A run that returned stays charged, even with zero competitors or a later storage error.
        discoveryReturned = true;

        console.log('[API-Onboarding] Microservice discovery completed:', {
          competitorCount: discoveryResult.competitors.length,
          userProductCount: discoveryResult.userProducts?.length ?? 0,
          competitorDomains: discoveryResult.competitors.map(c => c.domain)
        });

        await progressService.setProgress(
          sessionId,
          'storing_competitors',
          95,
          'Storing competitor data and setting up monitoring...',
          15
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
                  category: resolveProductCategory({
                    discoveredCategory:
                      'category' in userProduct ? userProduct.category : undefined,
                    businessType: data.businessType,
                  }),
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

            // Public facts go to the shared competitor row; this user's analysis is stored per user
            const competitorId = await persistCompetitorForUser(competitorStore, {
              userId: session.user.id,
              domain: competitor.domain,
              insight: competitor,
              relationshipStrength: Math.round(competitor.matchScore / 10), // Convert 0-100 to 0-10
            });
            console.log('[API-Onboarding] Competitor saved and linked:', { domain: competitor.domain, competitorId });

            // Discovered URLs get the same text rules as user-entered ones; the microservice
            // also resolves and checks each host before fetching.
            const monitorableUrls = monitorableEntries(competitor.monitoringData?.productUrls);

            // Create monitoring task if competitor has product URLs
            if (monitorableUrls.length > 0) {
              const userId = session.user.id;
              const kept = await withMonitoringCapacity(userId, async (tx, billing) => {
                const { remaining } = await billing.getMonitoredProductUsage(userId);
                const productUrls = monitorableUrls.slice(0, remaining);
                if (productUrls.length > 0) {
                  await createMonitoringTask({
                    userId,
                    competitorDomain: competitor.domain,
                    productUrls,
                    frequency: '0 */6 * * *',
                    enabled: true,
                    discoverySource: competitor.monitoringData?.extractionMethod,
                  }, tx);
                }
                return productUrls.length;
              });
              if (kept < monitorableUrls.length) {
                console.warn('[API-Onboarding] Monitored product limit reached; dropping product URLs:', {
                  domain: competitor.domain,
                  kept,
                  dropped: monitorableUrls.length - kept,
                });
              }
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

        // A newer analysis for this user and domain replaced this one. Leave the records to it.
        if (!(await progressService.isCurrentOnboardingJob(session.user.id, domainKey, sessionId))) {
          console.warn('[API-Onboarding] Job superseded before finalization:', sessionId);
          await progressService.setError(
            sessionId,
            'A newer analysis for this domain replaced this one. Check the latest progress.',
          );
          return;
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
        if (!discoveryReturned) {
          await releaseDiscoveryUsage(session.user.id, usageId).catch((releaseError: unknown) => {
            console.error('[API-Onboarding] Failed to release discovery usage:', releaseError);
          });
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await progressService.setError(
          sessionId, 
          `Competitor analysis failed: ${errorMessage}. Please try again or contact support.`
        );
      } finally {
        await progressService.releaseOnboardingJob(session.user.id, domainKey, sessionId);
      }
    })();
    
    console.log('[API-Onboarding] Request completed successfully:', { sessionId });
    return Response.json({ success: true, sessionId });
  } catch (error) {
    if (claimedJob) {
      await progressService.releaseOnboardingJob(claimedJob.userId, claimedJob.domainKey, claimedJob.sessionId);
    }
    if (reservation) {
      const { userId, usageId } = reservation;
      await releaseDiscoveryUsage(userId, usageId).catch((releaseError: unknown) => {
        console.error('[API-Onboarding] Failed to release discovery usage:', releaseError);
      });
    }
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
