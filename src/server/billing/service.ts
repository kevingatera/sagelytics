import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { resolvePlan, type PlanInfo } from './plans';
import type { BillingStore } from './store';

export interface DiscoveryUsage {
  used: number;
  limit: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface MonitoredProductUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface BillingServiceDeps {
  store: BillingStore;
  config: () => BillingConfig;
  now?: () => Date;
}

export function createBillingService({
  store,
  config,
  now = () => new Date(),
}: BillingServiceDeps) {
  async function planFrom(source: BillingStore, userId: string, at = now()): Promise<PlanInfo> {
    const cfg = config();
    const row = await source.getSubscription(userId);
    return resolvePlan(row, at, cfg.limits, cfg.enabled);
  }

  async function usageFrom(
    source: BillingStore,
    userId: string,
    plan: PlanInfo,
  ): Promise<DiscoveryUsage> {
    const used = await source.countUsage(userId, 'discovery', plan.periodStart, plan.periodEnd);
    const limit = plan.limits.discoveriesPerPeriod;
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      periodStart: plan.periodStart,
      periodEnd: plan.periodEnd,
    };
  }

  function discoveryLimitError(plan: PlanInfo, usage: DiscoveryUsage) {
    return new BillingLimitError({
      resource: 'discovery',
      plan: plan.plan,
      limit: usage.limit,
      used: usage.used,
      resetsAt: usage.periodEnd,
    });
  }

  return {
    getPlanForUser: (userId: string): Promise<PlanInfo> => planFrom(store, userId),

    getDiscoveryUsage: async (userId: string): Promise<DiscoveryUsage> =>
      usageFrom(store, userId, await planFrom(store, userId)),

    /**
     * Cheap, unlocked pre-check for an early 402 before any work starts. It does not reserve
     * anything; recordDiscoveryUsage is the authoritative, race-safe gate.
     */
    assertCanRunDiscovery: async (userId: string): Promise<DiscoveryUsage> => {
      const plan = await planFrom(store, userId);
      const usage = await usageFrom(store, userId, plan);
      if (usage.remaining <= 0) throw discoveryLimitError(plan, usage);
      return usage;
    },

    /**
     * Reserve one discovery: under the user's advisory lock, re-count the period and insert a
     * ledger row only if the user is still under the limit. Concurrent callers serialise on the
     * lock, so at most `limit` of them can succeed. Call it before the expensive work starts and
     * pass the returned id to releaseDiscoveryUsage if the work fails without charging anything.
     * One timestamp, taken after the lock is held, picks the period and stamps the row, so a
     * reservation made across a period boundary is counted in the period it was checked against.
     */
    recordDiscoveryUsage: async (
      userId: string,
      ref?: string | null,
    ): Promise<{ usageId: string; usage: DiscoveryUsage }> =>
      store.withUserLock(userId, async (locked) => {
        const at = now();
        const plan = await planFrom(locked, userId, at);
        const usage = await usageFrom(locked, userId, plan);
        if (usage.remaining <= 0) throw discoveryLimitError(plan, usage);
        const { id } = await locked.insertUsage(userId, 'discovery', ref ?? null, at);
        const used = usage.used + 1;
        return {
          usageId: id,
          usage: { ...usage, used, remaining: Math.max(0, usage.limit - used) },
        };
      }),

    /** Refund a reservation, e.g. when discovery failed before any paid API call. */
    releaseDiscoveryUsage: (userId: string, usageId: string): Promise<boolean> =>
      store.deleteUsage(userId, usageId),

    getMonitoredProductUsage: async (userId: string): Promise<MonitoredProductUsage> => {
      const plan = await planFrom(store, userId);
      const used = await store.countMonitoredProducts(userId);
      const limit = plan.limits.monitoredProducts;
      return { used, limit, remaining: Math.max(0, limit - used) };
    },

    /** Throws if adding `adding` monitored product URLs would exceed the plan limit. */
    assertCanMonitorProducts: async (
      userId: string,
      adding: number,
    ): Promise<MonitoredProductUsage> => {
      const plan = await planFrom(store, userId);
      const used = await store.countMonitoredProducts(userId);
      const limit = plan.limits.monitoredProducts;
      if (used + adding > limit) {
        throw new BillingLimitError({
          resource: 'monitored_product',
          plan: plan.plan,
          limit,
          used,
          resetsAt: null,
        });
      }
      return { used, limit, remaining: Math.max(0, limit - used) };
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
