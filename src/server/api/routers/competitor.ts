import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { competitors, userCompetitors, userOnboarding } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { MetricsService } from "~/lib/metrics-service";
import { MicroserviceClient } from "~/lib/services/microservice-client";
import type { DashboardData, CompetitorBase, Product } from "~/lib/types/dashboard";

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }): Promise<DashboardData> => {
    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const competitors: CompetitorBase[] = userCompetitorsList.map(
      (uc: { competitor: { domain: string; metadata: any } }) => {
        const products: Product[] = (uc.competitor.metadata?.products ?? []).map((p: any) => ({
          name: p.name ?? '',
          lastUpdated: p.lastUpdated ?? new Date().toISOString(),
          url: p.url ?? '',
          price: p.price ?? null,
          currency: p.currency ?? 'USD',
          matchedProducts: (p.matchedProducts ?? []).map((m: any) => ({
            name: m.name ?? '',
            url: m.url ?? '',
            matchScore: m.matchScore ?? 0,
            priceDiff: m.priceDiff ?? null
          }))
        }));

        return {
          domain: uc.competitor.domain,
          matchScore: uc.competitor.metadata?.matchScore ?? 0,
          matchReasons: uc.competitor.metadata?.matchReasons ?? [],
          suggestedApproach: uc.competitor.metadata?.suggestedApproach ?? '',
          dataGaps: uc.competitor.metadata?.dataGaps ?? [],
          products
        };
      }
    );

    return {
      competitors,
      priceData: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            label: "Your Price",
            data: [100, 105, 102, 108],
            borderColor: "rgb(53, 162, 235)",
            backgroundColor: "rgba(53, 162, 235, 0.5)",
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
      insights: generateCompetitorInsights(competitors.map(c => c.domain)),
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
    .input(z.object({ 
      url: z.string().transform((url) => {
        try {
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
          }
          const parsed = new URL(url);
          return parsed.hostname.replace('www.', '');
        } catch {
          throw new Error('Invalid URL format');
        }
      })
    }))
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      
      // Analyze competitor using microservice
      const microserviceClient = MicroserviceClient.getInstance();
      const analysis = await microserviceClient.analyzeCompetitor({
        competitorDomain: domain,
        businessContext: {
          userId: ctx.session.user.id
        }
      });

      const competitorRecords = await ctx.db
        .insert(competitors)
        .values({
          domain,
          metadata: {
            ...analysis,
            lastAnalyzed: new Date().toISOString(),
          }
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
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create or find competitor",
        });
      }

      await ctx.db
        .insert(userCompetitors)
        .values({
          userId: ctx.session.user.id,
          competitorId: competitor.id,
          relationshipStrength: 2,
        })
        .onConflictDoNothing();

      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ 
      url: z.string()
        .transform(domain => domain.toLowerCase().trim())
    }))
    .mutation(async ({ ctx, input }) => {
      const domain = input.url;
      const competitor = await ctx.db.query.competitors.findFirst({
        where: eq(competitors.domain, domain),
      });

      if (!competitor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Competitor not found"
        });
      }

      await ctx.db
        .delete(userCompetitors)
        .where(
          and(
            eq(userCompetitors.userId, ctx.session.user.id),
            eq(userCompetitors.competitorId, competitor.id)
          )
        );

      return { success: true };
    }),

  rediscover: protectedProcedure.mutation(async ({ ctx }) => {
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id),
    });

    if (!onboarding) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Complete onboarding first",
      });
    }

    if (!onboarding.productCatalogUrl) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Product catalog URL is required",
      });
    }

    const userCompetitorsList = await ctx.db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, ctx.session.user.id),
      with: { competitor: true },
    });

    const currentCompetitorDomains: string[] = userCompetitorsList.map(
      (uc: { competitor: { domain: string } }) => uc.competitor.domain
    );

    const microserviceClient = MicroserviceClient.getInstance();
    await microserviceClient.discoverCompetitors({
      domain: onboarding.companyDomain,
      userId: ctx.session.user.id,
      businessType: onboarding.businessType,
      knownCompetitors: currentCompetitorDomains,
      productCatalogUrl: onboarding.productCatalogUrl
    });

    return { success: true };
  }),
});

function generateMockPriceData(): number[] {
  return Array.from({ length: 4 }, () => Math.round(95 + Math.random() * 15));
}

function generateCompetitorInsights(competitors: string[]) {
  return competitors.map((competitor) => ({
    product: competitor,
    recommendation: Math.random() > 0.5 ? "increase" : "decrease",
    message: `Consider ${Math.random() > 0.5 ? "increasing" : "decreasing"} prices to match ${competitor}`,
    reason: `${competitor} has shown consistent ${Math.random() > 0.5 ? "higher" : "lower"} pricing in this category`
  }));
} 