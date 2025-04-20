import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { users } from '~/server/db/schema';
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

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    if (!user) throw new Error('User not found');
    return user;
  }),
  updateProfile: protectedProcedure.input(updateProfileSchema).mutation(async ({ ctx, input }) => {
    await ctx.db.update(users).set({
      name: input.name,
      email: input.email,
      image: input.image,
    }).where(eq(users.id, ctx.session.user.id));
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
}); 