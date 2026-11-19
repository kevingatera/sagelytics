import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import {
  getDiscoveryUsage,
  getMonitoredProductUsage,
  getPlanForUser,
  isBillingEnabled,
} from '~/server/billing';

export const billingRouter = createTRPCRouter({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [plan, discoveries, monitoredProducts] = await Promise.all([
      getPlanForUser(userId),
      getDiscoveryUsage(userId),
      getMonitoredProductUsage(userId),
    ]);

    return {
      billingEnabled: isBillingEnabled(),
      plan: plan.plan,
      status: plan.status,
      cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
      limits: plan.limits,
      periodStart: plan.periodStart,
      periodEnd: plan.periodEnd,
      usage: {
        discoveries,
        monitoredProducts,
      },
    };
  }),
});
