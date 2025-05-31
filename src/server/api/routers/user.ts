import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { users, userOnboarding, userCompetitors } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  company: z.string().max(255).optional(),
  image: z.string().url().max(255).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

const updateBusinessDetailsSchema = z.object({
  companyDomain: z.string().url(),
  productCatalogUrl: z.string().url().optional(),
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
  identifiedCompetitors: z.array(z.string()).optional(),
});

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    if (!user) throw new Error('User not found');
    return user;
  }),

  getOnboarding: protectedProcedure.query(async ({ ctx }) => {
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.session.user.id),
    });
    
    if (!onboarding) {
      return null;
    }

    // Ensure identifiedCompetitors is always an array
    const competitors = Array.isArray(onboarding.identifiedCompetitors) 
      ? onboarding.identifiedCompetitors 
      : onboarding.identifiedCompetitors 
        ? [onboarding.identifiedCompetitors].flat() 
        : [];

    return {
      ...onboarding,
      identifiedCompetitors: competitors,
    };
  }),

  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    await ctx.db.update(users).set({
      name: input.name,
      email: input.email,
      image: input.image,
    }).where(eq(users.id, ctx.session.user.id));
    return { success: true };
  }),

  updateBusinessDetails: protectedProcedure.input(updateBusinessDetailsSchema).mutation(async ({ ctx, input }) => {
    // Ensure identifiedCompetitors is properly formatted as an array
    const competitors = Array.isArray(input.identifiedCompetitors) 
      ? input.identifiedCompetitors 
      : input.identifiedCompetitors 
        ? [input.identifiedCompetitors].flat() 
        : [];

    await ctx.db.update(userOnboarding).set({
      companyDomain: input.companyDomain,
      productCatalogUrl: input.productCatalogUrl,
      businessType: input.businessType,
      identifiedCompetitors: competitors,
    }).where(eq(userOnboarding.userId, ctx.session.user.id));
    return { success: true };
  }),

  updatePassword: protectedProcedure.input(updatePasswordSchema).mutation(async ({ ctx, input }) => {
    if (input.newPassword !== input.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    if (!user?.password) throw new Error('User not found');
    const valid = await compare(input.currentPassword, user.password);
    if (!valid) throw new Error('Current password is incorrect');
    const hashed = await hash(input.newPassword, 10);
    await ctx.db.update(users).set({ password: hashed }).where(eq(users.id, ctx.session.user.id));
    return { success: true };
  }),

  resetOnboarding: protectedProcedure
    .input(z.object({
      confirmationText: z.string().refine(
        (val) => val === 'confirm',
        { message: 'You must type "confirm" to proceed' }
      ),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Remove all user-competitor relationships
      await ctx.db.delete(userCompetitors).where(eq(userCompetitors.userId, userId));

      // Check if onboarding record exists
      const existingOnboarding = await ctx.db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, userId),
      });

      if (existingOnboarding) {
        // Reset existing onboarding data
        await ctx.db.update(userOnboarding).set({
          companyDomain: '',
          productCatalogUrl: null,
          businessType: 'other',
          metricConfig: null,
          completed: false,
          identifiedCompetitors: [],
        }).where(eq(userOnboarding.userId, userId));
      } else {
        // Create new onboarding record if none exists
        await ctx.db.insert(userOnboarding).values({
          id: `onboarding_${userId}_${Date.now()}`,
          userId: userId,
          companyDomain: '',
          productCatalogUrl: null,
          businessType: 'other',
          metricConfig: null,
          completed: false,
          identifiedCompetitors: [],
        });
      }

      return { success: true };
    }),
}); 