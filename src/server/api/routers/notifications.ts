import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { 
  getOrCreateUserNotificationSettings, 
  updateUserNotificationSettings,
  getNotificationLogs
} from '~/server/db/queries/notifications';

const updateNotificationSettingsSchema = z.object({
  enablePriceAlerts: z.boolean().optional(),
  enableCompetitorUpdates: z.boolean().optional(),
  enableMarketInsights: z.boolean().optional(),
  enableBillingUpdates: z.boolean().optional(),
  schedule: z.enum(['instant', 'daily', 'weekly']).optional(),
});

export const notificationsRouter = createTRPCRouter({
  getSettings: protectedProcedure
    .query(async ({ ctx }) => {
      return await getOrCreateUserNotificationSettings(ctx.session.user.id);
    }),

  updateSettings: protectedProcedure
    .input(updateNotificationSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return await updateUserNotificationSettings(ctx.session.user.id, input);
    }),

  getLogs: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      return await getNotificationLogs(ctx.session.user.id, input.limit);
    }),
}); 