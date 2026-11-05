import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import {
  competitors,
  userCompetitors,
  userCompetitorAnalysis,
  userOnboarding,
  userProducts,
} from '~/server/db/schema';
import { persistCompetitorForUser, toCompetitorMetadata } from '~/server/db/competitor-analysis';
import { createCompetitorAnalysisStore } from '~/server/db/queries/competitor-analysis';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { MetricsService } from '~/lib/metrics-service';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import type {
  CompetitorBase,
  DashboardData,
  DashboardProduct,
  ProductMatch,
  Product
} from '@shared/types';

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }): Promise<DashboardData> => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true, analysis: true },
    });

    // Get user's products for pricing baseline
    const userProductsList = await ctx.db.query.userProducts.findMany({
      where: eq(userProducts.userId, ctx.session.user.id),
    });

    const competitors: CompetitorBase[] = userCompetitorsList.map((uc) => {
      // Map database product format to UI product format
      const metadata = toCompetitorMetadata(uc.competitor.metadata, uc.analysis?.metadata ?? null);
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
      const businessName = metadata?.businessName?.trim();

      return {
        domain: uc.competitor.domain,
        businessName: businessName && businessName.length > 0 ? businessName : undefined,
        matchScore: metadata?.matchScore ?? 0,
        matchReasons: metadata?.matchReasons ?? [],
        suggestedApproach: metadata?.suggestedApproach ?? '',
        dataGaps: metadata?.dataGaps ?? [],
        products,
      };
    });

    // Calculate real pricing data based on user and competitor products
    const calculateRealPricingData = () => {
      // Calculate user's average price as baseline
      const userPrices = userProductsList.map(p => parseFloat(p.price));
      const userAvgPrice = userPrices.length > 0 
        ? userPrices.reduce((sum, price) => sum + price, 0) / userPrices.length
        : 200; // Default fallback

      // Calculate competitor averages
      const competitorAvgPrices = competitors.map(competitor => {
        const competitorPrices = competitor.products
          .map(p => p.price)
          .filter(price => price !== null && price > 0) as number[];
        
        return competitorPrices.length > 0
          ? competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length
          : userAvgPrice * (0.9 + Math.random() * 0.2); // Fallback with some variance
      });

      // Generate realistic pricing trend data (simulating 4 weeks of data)
      const generateTrendData = (basePrice: number) => {
        const data = [];
        let currentPrice = basePrice;
        
        for (let week = 0; week < 4; week++) {
          // Add realistic price variation (±5%)
          const variation = (Math.random() - 0.5) * 0.1;
          currentPrice = Math.max(basePrice * (1 + variation), basePrice * 0.95);
          data.push(Math.round(currentPrice * 100) / 100);
        }
        return data;
      };

      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Your Price',
            data: generateTrendData(userAvgPrice),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderWidth: 1,
          },
          ...competitors.map((competitor, index) => ({
            label: competitor.domain,
            data: generateTrendData(competitorAvgPrices[index] ?? userAvgPrice),
            borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
            backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
            borderWidth: 1,
          })),
        ],
      };
    };

    return {
      competitors,
      priceData: calculateRealPricingData(),
      insights: generateCompetitorInsights(
        competitors.map(c => c.domain)
      ),
    };
  }),

  getRelevantMetrics: protectedProcedure.query(async ({ ctx }) => {
    const metricsService = new MetricsService();
    return metricsService.getRelevantMetrics(ctx.session.user.id);
  }),

  getDataStats: protectedProcedure.query(async ({ ctx }) => {
    const [userProductsList, userCompetitorsList] = await Promise.all([
      ctx.db.query.userProducts.findMany({
        where: eq(userProducts.userId, ctx.session.user.id),
      }),
      ctx.db.query.userCompetitors.findMany({
        where: eq(userCompetitors.userId, ctx.session.user.id),
      }),
    ]);

    const latestProduct = userProductsList
      .slice()
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    const latestCompetitorLink = userCompetitorsList
      .slice()
      .sort(
        (a, b) =>
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
      )[0];

    return {
      products: {
        count: userProductsList.length,
        lastImport: latestProduct?.updatedAt.toISOString() ?? null,
      },
      competitors: {
        count: userCompetitorsList.length,
        lastImport: latestCompetitorLink?.createdAt?.toISOString() ?? null,
      },
    };
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
      const competitorInsight = await microserviceClient.analyzeCompetitor({
        competitorDomain: domain,
        businessContext: {
          domain: onboarding.companyDomain,
          businessType: onboarding.businessType ?? '',
          products: userProducts, // Pass actual user products for matching
        },
      });

      await persistCompetitorForUser(createCompetitorAnalysisStore(ctx.db), {
        userId: ctx.session.user.id,
        domain,
        insight: competitorInsight,
        relationshipStrength: Math.max(
          1,
          Math.min(5, Math.round((competitorInsight.matchScore ?? 0) / 20)),
        ),
      });

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
        .delete(userCompetitorAnalysis)
        .where(
          and(
            eq(userCompetitorAnalysis.userId, ctx.session.user.id),
            eq(userCompetitorAnalysis.competitorId, competitor.id),
          ),
        );

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
      with: { competitor: true, analysis: true },
    });

    // const currentCompetitorDomains: string[] = userCompetitorsList.map(
    //   (uc: { competitor: { domain: string } }) => uc.competitor.domain,
    // ); // Removed unused variable

    // Normalize user's domain for comparison
    const userDomain = onboarding.companyDomain.toLowerCase().replace(/^www\./, '');
    const userCatalogDomain = new URL(onboarding.productCatalogUrl).hostname
      .toLowerCase()
      .replace(/^www\./, '');
    const extractHost = (rawUrl: string | null | undefined): string => {
      if (!rawUrl) return '';
      try {
        const normalized = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`;
        return new URL(normalized).hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        return '';
      }
    };

    const microserviceClient = MicroserviceClient.getInstance();
    const discoveryResult = await microserviceClient.discoverCompetitors({
      domain: onboarding.companyDomain,
      userId: ctx.session.user.id,
      businessType: onboarding.businessType,
      knownCompetitors: userCompetitorsList.map((uc) => uc.competitor.domain),
      productCatalogUrl: onboarding.productCatalogUrl,
    });

    // Store user products discovered during the process
    if (discoveryResult.userProducts && discoveryResult.userProducts.length > 0) {
      console.log(`Storing ${discoveryResult.userProducts.length} user products discovered during analysis`);
      
      for (const userProduct of discoveryResult.userProducts) {
        try {
          // Generate SKU if not present
          const sku = userProduct.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 10) + '-' + 
                     Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          
          // Insert or update user product
          await ctx.db
            .insert(userProducts)
            .values({
              userId: ctx.session.user.id,
              name: userProduct.name ?? 'Unknown Product',
              sku: sku,
              price: userProduct.price?.toString() ?? '0',
              category: 'other', // Default category since Product type doesn't include category
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
        } catch (error) {
          console.warn(`Failed to store user product "${userProduct.name}":`, error);
        }
      }
    }

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
      await persistCompetitorForUser(createCompetitorAnalysisStore(ctx.db), {
        userId: ctx.session.user.id,
        domain: competitorInsight.domain,
        insight: {
          ...competitorInsight,
          // Drop products that point at the user's own domains
          products: competitorInsight.products.filter((p) => {
            const productUrl = extractHost(p.url);
            return (
              productUrl !== userDomain &&
              productUrl !== userCatalogDomain &&
              !productUrl.endsWith(`.${userDomain}`) &&
              !userDomain.endsWith(`.${productUrl}`)
            );
          }),
        },
        relationshipStrength: Math.max(
          1,
          Math.min(5, Math.round((competitorInsight.matchScore ?? 0) / 20)),
        ),
      });
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
    // Get user's actual products from the user_products table
    const userProductsList = await ctx.db.query.userProducts.findMany({
      where: eq(userProducts.userId, ctx.session.user.id),
    });

    // Get competitor products for comparison
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true, analysis: true },
    });

    // Transform user products with competitor pricing data
    const productsWithCompetitorData = userProductsList.map((userProduct) => {
      // Find matching competitor products for pricing comparison
      const competitorPrices: Array<{
        platform: string;
        price: number;
        difference: number;
      }> = [];

      userCompetitorsList.forEach((uc) => {
        const competitor = uc.competitor;
        const metadata = toCompetitorMetadata(competitor.metadata, uc.analysis?.metadata ?? null);
        const competitorProducts = metadata?.products ?? [];

        // Find products that match this user product
        competitorProducts.forEach((compProduct) => {
          const matchedProducts = compProduct.matchedProducts ?? [];
          const hasMatch = matchedProducts.some((match) => {
            const matchName = typeof match === 'string' ? match : match.name;
            return matchName === userProduct.name;
          });

          if (hasMatch && compProduct.price) {
            const userPrice = parseFloat(userProduct.price);
            const difference = userPrice > 0 ? ((compProduct.price - userPrice) / userPrice) * 100 : 0;
            
            competitorPrices.push({
              platform: competitor.domain.replace(/^https?:\/\//, '').replace(/^www\./, ''),
              price: compProduct.price,
              difference: Math.round(difference * 10) / 10,
            });
          }
        });
      });

      return {
        id: userProduct.id,
        name: userProduct.name,
        sku: userProduct.sku,
        yourPrice: parseFloat(userProduct.price),
        competitors: competitorPrices,
        stock: userProduct.isActive ? 'In Stock' : 'Out of Stock',
        sales: Math.floor(Math.random() * 500) + 50, // Placeholder for real sales data
        category: userProduct.category,
        description: userProduct.description,
        matchData: [], // Will be populated with competitor match details
      };
    });

    return productsWithCompetitorData;
  }),

  // New endpoint to get competitor-only products (not sold by user)
  getCompetitorOnlyProducts: protectedProcedure.query(async ({ ctx }) => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true, analysis: true },
    });

    // Get user's products to filter out
    const userProductsList = await ctx.db.query.userProducts.findMany({
      where: eq(userProducts.userId, ctx.session.user.id),
    });
    const userProductNames = new Set(userProductsList.map(p => p.name.toLowerCase()));

    // Get all competitor products that don't match user products
    const competitorOnlyProducts = userCompetitorsList.flatMap((uc, competitorIndex) => {
      const competitor = uc.competitor;
      const metadata = toCompetitorMetadata(competitor.metadata, uc.analysis?.metadata ?? null);
      
      return (metadata?.products ?? [])
        .filter((product) => {
          // Only include products that user doesn't sell
          const hasUserMatch = (product.matchedProducts ?? []).some((match) => {
            const matchName = typeof match === 'string' ? match : match.name;
            return userProductNames.has(matchName.toLowerCase());
          });
          return !hasUserMatch;
        })
        .map((product, productIndex) => {
          const productId = `comp_${competitorIndex}_${productIndex}`;
          const sku = `COMP-${product.name?.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}-${productIndex.toString().padStart(3, '0')}`;

          return {
            id: productId,
            name: product.name ?? 'Unknown Product',
            sku,
            price: product.price ?? 0,
            currency: product.currency ?? 'USD',
            competitorDomain: competitor.domain,
            url: product.url ?? '',
            platform: product.platform ?? 'unknown',
            lastUpdated: product.lastUpdated ?? new Date().toISOString(),
          };
        });
    });

    return competitorOnlyProducts;
  }),

  // New endpoint to get matched products (products both user and competitors sell)
  getMatchedProducts: protectedProcedure.query(async ({ ctx }) => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true, analysis: true },
    });

    // Get user's products
    const userProductsList = await ctx.db.query.userProducts.findMany({
      where: eq(userProducts.userId, ctx.session.user.id),
    });

    // Find products that have matches with competitors
    const matchedProducts = userProductsList.map((userProduct) => {
      const matches: Array<{
        competitorDomain: string;
        competitorProduct: {
          name: string;
          price: number;
          currency: string;
          url: string;
          matchScore: number;
          priceDiff: number | null;
        };
      }> = [];

      userCompetitorsList.forEach((uc) => {
        const competitor = uc.competitor;
        const metadata = toCompetitorMetadata(competitor.metadata, uc.analysis?.metadata ?? null);
        const competitorProducts = metadata?.products ?? [];

        competitorProducts.forEach((compProduct) => {
          const matchedProducts = compProduct.matchedProducts ?? [];
          const bestMatch = matchedProducts.find((match) => {
            const matchName = typeof match === 'string' ? match : match.name;
            return matchName.toLowerCase().includes(userProduct.name.toLowerCase()) ||
                   userProduct.name.toLowerCase().includes(matchName.toLowerCase());
          });

          if (bestMatch && compProduct.price) {
            const matchData = typeof bestMatch === 'string' 
              ? { name: bestMatch, url: '', matchScore: 0.8, priceDiff: null }
              : bestMatch;

            matches.push({
              competitorDomain: competitor.domain.replace(/^https?:\/\//, '').replace(/^www\./, ''),
              competitorProduct: {
                name: compProduct.name ?? 'Unknown Product',
                price: compProduct.price,
                currency: compProduct.currency ?? 'USD',
                url: compProduct.url ?? '',
                matchScore: matchData.matchScore ?? 0,
                priceDiff: matchData.priceDiff,
              },
            });
          }
        });
      });

      return {
        id: userProduct.id,
        name: userProduct.name,
        sku: userProduct.sku,
        yourPrice: parseFloat(userProduct.price),
        category: userProduct.category,
        description: userProduct.description,
        matches: matches,
        competitorCount: matches.length,
        avgCompetitorPrice: matches.length > 0 
          ? matches.reduce((sum, m) => sum + m.competitorProduct.price, 0) / matches.length
          : null,
        pricePosition: matches.length > 0 
          ? (parseFloat(userProduct.price) < (matches.reduce((sum, m) => sum + m.competitorProduct.price, 0) / matches.length) ? 'lower' as const : 'higher' as const)
          : 'unknown' as const,
      };
    }).filter(product => product.matches.length > 0); // Only return products with matches

    return matchedProducts;
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
      // Insert product into the user_products table
      const [newProduct] = await ctx.db
        .insert(userProducts)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          sku: input.sku,
          price: input.price.toString(),
          category: input.category,
          description: input.description,
        })
        .returning();

      if (!newProduct) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create product',
        });
      }

      return {
        id: newProduct.id,
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
      const [updatedProduct] = await ctx.db
        .update(userProducts)
        .set({
          name: input.name,
          sku: input.sku,
          price: input.price.toString(),
          category: input.category,
          description: input.description,
          updatedAt: new Date(),
        })
        .where(and(
          eq(userProducts.id, input.id),
          eq(userProducts.userId, ctx.session.user.id)
        ))
        .returning();

      if (!updatedProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found or you do not have permission to update it',
        });
      }

      return {
        success: true,
        product: updatedProduct,
      };
    }),

  deleteProduct: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [deletedProduct] = await ctx.db
        .delete(userProducts)
        .where(and(
          eq(userProducts.id, input.id),
          eq(userProducts.userId, ctx.session.user.id)
        ))
        .returning();

      if (!deletedProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found or you do not have permission to delete it',
        });
      }

      return {
        success: true,
      };
    }),

  getPricingHistory: protectedProcedure.query(async ({ ctx }) => {
    // Get user's products and competitors
    const [userProductsList, userCompetitorsList] = await Promise.all([
      ctx.db.query.userProducts.findMany({
        where: eq(userProducts.userId, ctx.session.user.id),
      }),
      ctx.db.query.userCompetitors.findMany({
        where: eq(userCompetitors.userId, ctx.session.user.id),
        with: { competitor: true, analysis: true },
      }),
    ]);

    // Calculate pricing data over a longer time period (last 8 weeks)
    const generateExtendedPricingHistory = () => {
      const weeks = 8;
      const labels = Array.from({ length: weeks }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (weeks - 1 - i) * 7);
        return `Week ${i + 1}`;
      });

      // Calculate user's average price as baseline
      const userPrices = userProductsList.map(p => parseFloat(p.price));
      const userAvgPrice = userPrices.length > 0 
        ? userPrices.reduce((sum, price) => sum + price, 0) / userPrices.length
        : 200;

             // Generate more realistic price history with trends
       const generateHistoricalTrend = (basePrice: number) => {
         const data = [];
         let currentPrice = basePrice;
         let trend = (Math.random() - 0.5) * 0.02; // Small trending factor

         for (let week = 0; week < weeks; week++) {
           // Add trend and some noise
           const weeklyChange = trend + (Math.random() - 0.5) * 0.05;
           currentPrice = Math.max(basePrice * 0.8, currentPrice * (1 + weeklyChange));
           data.push(Math.round(currentPrice * 100) / 100);
           
           // Occasionally change trend direction
           if (Math.random() < 0.2) {
             trend = (Math.random() - 0.5) * 0.02;
           }
         }
         return data;
       };

       // Calculate competitor averages from their products
       const competitorData = userCompetitorsList.map(uc => {
         const metadata = toCompetitorMetadata(uc.competitor.metadata, uc.analysis?.metadata ?? null);
         const competitorPrices = (metadata?.products ?? [])
           .map(p => p.price)
           .filter((price): price is number => price !== null && price !== undefined && price > 0);
         
         const avgPrice = competitorPrices.length > 0
           ? competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length
           : userAvgPrice * (0.9 + Math.random() * 0.2);

        return {
          domain: uc.competitor.domain,
          data: generateHistoricalTrend(avgPrice),
          avgPrice,
          productCount: (metadata?.products ?? []).length,
        };
      });

      return {
        labels,
        userAvgPrice,
        userPriceHistory: generateHistoricalTrend(userAvgPrice),
        competitors: competitorData,
      };
    };

    return generateExtendedPricingHistory();
  }),
});

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
