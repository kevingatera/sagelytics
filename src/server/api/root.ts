import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { competitorRouter } from './routers/competitor';
import { userRouter } from './routers/user';
import { notificationsRouter } from './routers/notifications';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  competitor: competitorRouter,
  user: userRouter,
  notifications: notificationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.user.all();
 *       ^? User[]
 */
export const createCaller = createCallerFactory(appRouter);
