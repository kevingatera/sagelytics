import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { userOnboarding } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const competitorRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const onboardingData = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id)
    });

    if (!onboardingData) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Onboarding data not found. Please complete onboarding first."
      });
    }

    return {
      competitors: onboardingData.identifiedCompetitors || [],
      priceData: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            label: "Your Price",
            data: [100, 105, 102, 108],
            borderColor: "rgb(53, 162, 235)",
            backgroundColor: "rgba(53, 162, 235, 0.5)",
          },
          {
            label: "Competitor A",
            data: [98, 103, 106, 105],
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
          },
          {
            label: "Competitor B",
            data: [102, 100, 104, 106],
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.5)",
          },
        ],
      },
      insights: [
        {
          product: "Product A",
          recommendation: "Increase price by 10%",
        },
      ],
    };
  }),
}); 