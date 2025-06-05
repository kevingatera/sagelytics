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
import type {
  CompetitorBase,
  CompetitorInsight,
  DashboardData,
  DashboardProduct,
  ListingPlatform,
  ProductMatch,
  Product
} from '@shared/types';

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }): Promise<DashboardData> => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const competitors: CompetitorBase[] = userCompetitorsList.map((uc) => {
      // Map database product format to UI product format
      const metadata = uc.competitor.metadata;
      const products: DashboardProduct[] = (metadata?.products ?? []).map((p) => {
        // The matchedProducts from DB represent user products that match this competitor product
        // Transform them into the expected UI format
        // Handle both object format and legacy string format from database
        const matchedProducts: ProductMatch[] = (p.matchedProducts ?? []).map((match) => {
          // Handle legacy string format found in database
          if (typeof match === 'string') {
            return {
              name: match,
              url: null,
              price: null,
              currency: null,
              matchScore: 85, // Default reasonable score for legacy matches
              priceDiff: undefined,
              matchedProducts: [],
              lastUpdated: new Date().toISOString(),
            };
          }
          
          // Handle proper object format
          return {
            name: match.name ?? '',
            url: match.url,
            price: null,
            currency: null,
            matchScore: match.matchScore ?? 0,
            priceDiff: match.priceDiff ?? undefined,
            matchedProducts: [], // This is correct - ProductMatch doesn't need nested matches
            lastUpdated: new Date().toISOString(),
          };
        });
        
        return {
          name: p.name ?? '',
          lastUpdated: p.lastUpdated ?? new Date().toISOString(),
          url: p.url ?? '',
          price: p.price ?? null,
          currency: p.currency ?? 'USD',
          matchedProducts,
        };
      });
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
      insights: generateCompetitorInsights(
        competitors.map(c => c.domain)
      ),
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

      // Get existing competitors for context - Removed as it's unused in this mutation
      // const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      //   where: eq(userCompetitors.userId, ctx.session.user.id),
      //   with: { competitor: true },
      // });

      // const currentCompetitorDomains: string[] = userCompetitorsList.map(
      //   (uc) => uc.competitor.domain,
      // ); // Removed unused variable

      // Analyze competitor using microservice
      const microserviceClient = MicroserviceClient.getInstance();
      
      // Fetch user product catalog for matching
      let userProducts: Product[] = [];
      console.log('Onboarding data:', {
        productCatalogUrl: onboarding.productCatalogUrl,
        companyDomain: onboarding.companyDomain,
        businessType: onboarding.businessType
      });
      
      if (onboarding.productCatalogUrl) {
        try {
          console.log('Fetching product catalog from:', onboarding.productCatalogUrl);
          const catalog = await microserviceClient.discoverWebsiteContent(onboarding.productCatalogUrl);
          console.log('Fetched catalog:', {
            url: catalog.url,
            productCount: catalog.products?.length || 0,
            products: catalog.products?.slice(0, 3) // Log first 3 products for debugging
          });
          userProducts = Array.isArray(catalog.products)
            ? catalog.products.map((p) => ({
                name: p.name,
                description: p.description ?? undefined,
                url: p.url ?? undefined,
                price: p.price ?? undefined,
                currency: p.currency ?? undefined,
              }))
            : [];
          console.log('Parsed user products:', {
            count: userProducts.length,
            products: userProducts.slice(0, 3) // Log first 3 for debugging
          });
        } catch (err) {
          console.error('Failed to fetch user product catalog:', err);
        }
      }
      
      // Use analyzeCompetitor instead of discoverCompetitors for single competitor analysis
      console.log('Calling microservice with business context:', {
        domain: onboarding.companyDomain,
        businessType: onboarding.businessType,
        productsCount: userProducts.length
      });
      const competitorInsightResponse = await microserviceClient.analyzeCompetitor({
        competitorDomain: domain,
        businessContext: {
          domain: onboarding.companyDomain,
          businessType: onboarding.businessType ?? '',
          products: userProducts, // Pass actual user products for matching
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
          ? competitorInsight.listingPlatforms.map((p: ListingPlatform) => ({
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
          ? competitorInsight.products.map((p: ProductMatch) => ({
              name: p.name ?? "",
              url: p.url ?? "",
              price: p.price ?? 0,
              currency: p.currency ?? "USD",
              platform: "unknown", // Default platform
              matchedProducts: p.matchedProducts.map(m => ({
                name: m.name ?? "",
                url: m.url ?? "",
                matchScore: m.matchScore ?? 0,
                priceDiff: m.priceDiff ?? null
              })),
              lastUpdated: new Date().toISOString(),
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

    // const currentCompetitorDomains: string[] = userCompetitorsList.map(
    //   (uc: { competitor: { domain: string } }) => uc.competitor.domain,
    // ); // Removed unused variable

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
      knownCompetitors: userCompetitorsList.map((uc) => uc.competitor.domain),
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
            name: p.name ?? "",
            url: p.url ?? "",
            price: p.price ?? 0,
            currency: p.currency ?? "USD",
            platform: "unknown", // Default platform
            matchedProducts: p.matchedProducts.map(m => ({
              name: m.name ?? "",
              url: m.url ?? "",
              matchScore: m.matchScore ?? 0,
              priceDiff: m.priceDiff ?? null
            })),
            lastUpdated: new Date().toISOString(),
          })),
      } satisfies CompetitorMetadata;

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

  getProducts: protectedProcedure.query(async ({ ctx }) => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    // Get user's own domain from onboarding data for filtering
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id),
    });

    const userDomain = onboarding?.companyDomain ?? '';

    // Flatten all competitor products into a single array with additional context
    const allProducts = userCompetitorsList.flatMap((uc, competitorIndex) => {
      const competitor = uc.competitor;
      const metadata = competitor.metadata;
      
      return (metadata?.products ?? []).map((product, productIndex) => {
        // Handle the current data structure where matchedProducts might be strings or objects
        const matchedProducts = product.matchedProducts ?? [];
        
        // Convert string array to proper object structure
        const normalizedMatches = matchedProducts.map((match, idx) => {
          if (typeof match === 'string') {
            // If it's a string, create a default object structure
            return {
              name: match,
              url: product.url ?? '',
              matchScore: 85, // Default match score
              priceDiff: null as number | null,
            };
          } else {
            // If it's already an object, use it as is
            return {
              name: match.name ?? '',
              url: match.url ?? product.url ?? '',
              matchScore: match.matchScore ?? 85,
              priceDiff: match.priceDiff ?? null,
            };
          }
        });

        // Create competitor price breakdown - use actual product price from competitor
        const competitors = normalizedMatches.length > 0 ? normalizedMatches.map(match => ({
          platform: competitor.domain.replace(/^https?:\/\//, '').replace(/^www\./, ''),
          price: product.price ?? 0,
          difference: match.priceDiff ?? 0,
        })) : [];

        // Generate a unique ID and SKU
        const productId = competitorIndex * 1000 + productIndex + 1;
        const sku = `${product.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}-${productId.toString().padStart(3, '0')}`;

        return {
          id: productId,
          name: product.name ?? 'Unknown Product',
          sku,
          yourPrice: product.price ?? 0,
          competitors,
          stock: 'In Stock', // Default stock status
          sales: Math.floor(Math.random() * 500) + 50, // Simulated sales data
          matchData: normalizedMatches.map(match => ({
            name: match.name,
            url: match.url,
            price: product.price,
            currency: product.currency ?? 'USD',
            matchedProducts: [{
              name: match.name,
              url: match.url,
              matchScore: match.matchScore,
              priceDiff: match.priceDiff
            }],
            lastUpdated: product.lastUpdated
          }))
        };
      });
    });

    return allProducts;
  }),

  addProduct: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().positive(),
      category: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // For now, we'll store products in a simple table structure
      // In a real implementation, this would be a proper products table
      const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store in user's metadata for simplicity (should be separate table in production)
      const onboarding = await ctx.db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, ctx.session.user.id),
      });

      if (!onboarding) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User onboarding not found',
        });
      }

      // For now, return success - in production this would insert into a products table
      return {
        id: productId,
        ...input,
        success: true,
      };
    }),

  updateProduct: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
      sku: z.string().min(1),
      price: z.number().positive(),
      category: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // For now, return success - in production this would update a products table
      return {
        success: true,
      };
    }),

  deleteProduct: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // For now, return success - in production this would delete from products table
      return {
        success: true,
      };
    }),
});

function generateMockPriceData(): number[] {
  return Array.from({ length: 4 }, () => Math.round(95 + Math.random() * 15));
}

function generateCompetitorInsights(competitors: string[]): Array<{
  product: string;
  recommendation: string;
  message: string;
  reason: string;
}> {
  return competitors.map((competitor) => ({
    product: competitor,
    recommendation: Math.random() > 0.5 ? 'increase' : 'decrease',
    message: `Consider ${Math.random() > 0.5 ? 'increasing' : 'decreasing'} prices to match ${competitor}`,
    reason: `${competitor} has shown consistent ${Math.random() > 0.5 ? 'higher' : 'lower'} pricing in this category`,
  }));
}
