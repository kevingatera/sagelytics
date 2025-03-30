import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import {
  competitors,
  userCompetitors,
  userOnboarding,
  type CompetitorMetadata,
} from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { MetricsService } from '~/lib/metrics-service';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import type { DashboardData, CompetitorBase, Product } from '~/lib/types/dashboard';
import { CompetitorInsight } from '~/microservices/src/competitor/interfaces/competitor-insight.interface';

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }): Promise<DashboardData> => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const competitors: CompetitorBase[] = userCompetitorsList.map((uc) => {
      // Map database product format to UI product format
      const metadata = uc.competitor.metadata;
      const products: Product[] = (metadata?.products ?? []).map((p) => ({
        name: p.name ?? '',
        lastUpdated: p.lastUpdated ?? new Date().toISOString(),
        url: p.url ?? '',
        price: p.price ?? null,
        currency: p.currency ?? 'USD',
        // Convert string[] to MatchedProductUI[]
        matchedProducts: p.matchedProducts.map((m) => typeof m === 'string' 
          ? { name: m, url: '', matchScore: 0, priceDiff: null } 
          : {
              name: (m as unknown as { name: string }).name ?? '',
              url: (m as unknown as { url: string }).url ?? '',
              matchScore: (m as unknown as { matchScore: number }).matchScore ?? 0,
              priceDiff: (m as unknown as { priceDiff: number | null }).priceDiff ?? null,
            }
        ),
      }));

      return {
        domain: uc.competitor.domain,
        matchScore: metadata?.matchScore ?? 0,
        matchReasons: metadata?.matchReasons ?? [],
        suggestedApproach: metadata?.suggestedApproach ?? '',
        dataGaps: metadata?.dataGaps ?? [],
        products,
      };
    });

    return {
      competitors,
      priceData: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Your Price',
            data: [100, 105, 102, 108],
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderWidth: 1,
          },
          ...competitors.map((competitor, index) => ({
            label: competitor.domain,
            data: generateMockPriceData(),
            borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
            backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
            borderWidth: 1,
          })),
        ],
      },
      insights: generateCompetitorInsights(competitors.map((c) => c.domain)),
    };
  }),

  getRelevantMetrics: protectedProcedure.query(async ({ ctx }) => {
    const metricsService = new MetricsService();
    return metricsService.getRelevantMetrics(ctx.session.user.id);
  }),

  getComparisons: protectedProcedure
    .input(z.object({ metric: z.string() }))
    .query(async ({ ctx, input }) => {
      const metricsService = new MetricsService();
      return metricsService.calculateMetricComparison(input.metric, ctx.session.user.id);
    }),

  add: protectedProcedure
    .input(
      z.object({
        url: z.string().transform((url) => {
          try {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = `https://${url}`;
            }
            const parsed = new URL(url);
            parsed.hostname = parsed.hostname.replace(/^www\./, '');
            return parsed.toString();
          } catch {
            throw new Error('Invalid URL format');
          }
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      const onboarding = await ctx.db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, ctx.session.user.id),
      });

      if (!onboarding) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Complete onboarding first',
        });
      }

      // Get existing competitors for context
      const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
        where: eq(userCompetitors.userId, ctx.session.user.id),
        with: { competitor: true },
      });

      const currentCompetitorDomains: string[] = userCompetitorsList.map(
        (uc) => uc.competitor.domain,
      );

      // Analyze competitor using microservice
      const microserviceClient = MicroserviceClient.getInstance();
      
      // Use analyzeCompetitor instead of discoverCompetitors for single competitor analysis
      const competitorInsightResponse = await microserviceClient.analyzeCompetitor({
        competitorDomain: domain,
        businessContext: {
          businessType: onboarding.businessType ?? '',
          userProducts: [], // Pass empty array as products aren't in onboarding schema
        },
      });

      if (!competitorInsightResponse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Could not analyze this competitor',
        });
      }

      // Cast to any to work around type issues
      const competitorInsight = competitorInsightResponse as unknown as CompetitorInsight;

      // Transform the competitor insight into CompetitorMetadata
      const metadata: CompetitorMetadata = {
        matchScore: competitorInsight.matchScore ?? 0,
        matchReasons: competitorInsight.matchReasons ?? [],
        suggestedApproach: competitorInsight.suggestedApproach ?? '',
        dataGaps: competitorInsight.dataGaps ?? [],
        lastAnalyzed: new Date().toISOString(),
        platforms: Array.isArray(competitorInsight.listingPlatforms) 
          ? competitorInsight.listingPlatforms.map((p) => ({
              platform: p.platform ?? '',
              url: p.url ?? '',
              metrics: {
                rating: p.rating ?? undefined,
                reviewCount: p.reviewCount ?? undefined,
                priceRange: p.priceRange
                  ? {
                      min: p.priceRange.min ?? 0,
                      max: p.priceRange.max ?? 0,
                      currency: p.priceRange.currency ?? 'USD',
                    }
                  : undefined,
                lastUpdated: new Date().toISOString(),
              },
            }))
          : [],
        products: Array.isArray(competitorInsight.products) 
          ? competitorInsight.products.map((p) => ({
              name: p.name ?? '',
              url: p.url ?? '',
              price: p.price ?? 0,
              currency: p.currency ?? 'USD',
              platform: 'unknown',
              matchedProducts: Array.isArray(p.matchedProducts) 
                ? p.matchedProducts.map((m: { name?: string }) => m.name ?? '')
                : [],
              lastUpdated: p.lastUpdated ?? new Date().toISOString(),
            }))
          : [],
      };

      const competitorRecords = await ctx.db
        .insert(competitors)
        .values({
          domain: domain,
          metadata,
        })
        .onConflictDoNothing()
        .returning();

      const competitor =
        competitorRecords[0] ??
        (await ctx.db.query.competitors.findFirst({
          where: eq(competitors.domain, domain),
        }));

      if (!competitor) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create or find competitor',
        });
      }

      await ctx.db
        .insert(userCompetitors)
        .values({
          userId: ctx.session.user.id,
          competitorId: competitor.id,
          relationshipStrength: Math.round(competitorInsight.matchScore * 5), // Convert 0-1 score to 0-5 scale
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  remove: protectedProcedure
    .input(
      z.object({
        url: z.string().transform((domain) => domain.toLowerCase().trim()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      const competitor = await ctx.db.query.competitors.findFirst({
        where: eq(competitors.domain, domain),
      });

      if (!competitor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competitor not found',
        });
      }

      await ctx.db
        .delete(userCompetitors)
        .where(
          and(
            eq(userCompetitors.userId, ctx.session.user.id),
            eq(userCompetitors.competitorId, competitor.id),
          ),
        );

      return { success: true };
    }),

  rediscover: protectedProcedure.mutation(async ({ ctx }) => {
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id),
    });

    if (!onboarding) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Complete onboarding first',
      });
    }

    if (!onboarding.productCatalogUrl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Product catalog URL is required',
      });
    }

    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const currentCompetitorDomains: string[] = userCompetitorsList.map(
      (uc: { competitor: { domain: string } }) => uc.competitor.domain,
    );

    // Normalize user's domain for comparison
    const userDomain = onboarding.companyDomain.toLowerCase().replace(/^www\./, '');
    const userCatalogDomain = new URL(onboarding.productCatalogUrl).hostname
      .toLowerCase()
      .replace(/^www\./, '');

    const microserviceClient = MicroserviceClient.getInstance();
    const discoveryResult = await microserviceClient.discoverCompetitors({
      domain: onboarding.companyDomain,
      userId: ctx.session.user.id,
      businessType: onboarding.businessType,
      knownCompetitors: currentCompetitorDomains,
      productCatalogUrl: onboarding.productCatalogUrl,
    });

    // Filter out user's own domains from competitors
    const filteredCompetitors = discoveryResult.competitors.filter((competitor) => {
      const competitorDomain = competitor.domain.toLowerCase().replace(/^www\./, '');
      return (
        competitorDomain !== userDomain &&
        competitorDomain !== userCatalogDomain &&
        !competitorDomain.endsWith(`.${userDomain}`) && // Subdomains
        !userDomain.endsWith(`.${competitorDomain}`)
      ); // Parent domains
    });

    // Process each discovered competitor
    for (const competitorInsight of filteredCompetitors) {
      // Transform insight into CompetitorMetadata format
      const metadata = {
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
        products: competitorInsight.products
          // Filter out products that match user's domain
          .filter((p) => {
            const productUrl = p.url
              ? new URL(p.url).hostname.toLowerCase().replace(/^www\./, '')
              : '';
            return (
              productUrl !== userDomain &&
              productUrl !== userCatalogDomain &&
              !productUrl.endsWith(`.${userDomain}`) &&
              !userDomain.endsWith(`.${productUrl}`)
            );
          })
          .map((p) => ({
            name: p.name,
            url: p.url ?? '',
            price: p.price ?? 0,
            currency: p.currency ?? 'USD',
            platform: 'unknown',
            matchedProducts: p.matchedProducts.map((m) => m.name),
            lastUpdated: p.lastUpdated,
          })),
      } satisfies CompetitorMetadata;

      // Skip if no valid products after filtering
      if (metadata.products.length === 0) continue;

      // Insert competitor if not exists
      const competitorRecords = await ctx.db
        .insert(competitors)
        .values({
          domain: competitorInsight.domain,
          metadata,
        })
        .onConflictDoNothing()
        .returning();

      const competitor =
        competitorRecords[0] ??
        (await ctx.db.query.competitors.findFirst({
          where: eq(competitors.domain, competitorInsight.domain),
        }));

      if (!competitor) continue;

      // Link competitor to user if not already linked
      await ctx.db
        .insert(userCompetitors)
        .values({
          userId: ctx.session.user.id,
          competitorId: competitor.id,
          relationshipStrength: Math.round(competitorInsight.matchScore * 5), // Convert 0-1 score to 0-5 scale
        })
        .onConflictDoNothing();
    }

    return {
      success: true,
      stats: {
        ...discoveryResult.stats,
        totalDiscovered: filteredCompetitors.length, // Update with filtered count
      },
      recommendedSources: discoveryResult.recommendedSources,
    };
  }),
});

function generateMockPriceData(): number[] {
  return Array.from({ length: 4 }, () => Math.round(95 + Math.random() * 15));
}

function generateCompetitorInsights(competitors: string[]) {
  return competitors.map((competitor) => ({
    product: competitor,
    recommendation: Math.random() > 0.5 ? 'increase' : 'decrease',
    message: `Consider ${Math.random() > 0.5 ? 'increasing' : 'decreasing'} prices to match ${competitor}`,
    reason: `${competitor} has shown consistent ${Math.random() > 0.5 ? 'higher' : 'lower'} pricing in this category`,
  }));
}
