import type { BillingConfig } from './config';
import { BillingLimitError } from './errors';
import { resolvePlan, type PlanInfo } from './plans';
import type { BillingStore, BillingTransaction } from './store';

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

  function monitoredLimitError(plan: PlanInfo, used: number) {
    return new BillingLimitError({
      resource: 'monitored_product',
      plan: plan.plan,
      limit: plan.limits.monitoredProducts,
      used,
      resetsAt: null,
    });
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

    /**
     * Unlocked check: throws if adding `adding` monitored product URLs would exceed the plan
     * limit. Two concurrent requests can both pass; use reserveMonitoredProducts to be exact.
     */
    assertCanMonitorProducts: async (
      userId: string,
      adding: number,
    ): Promise<MonitoredProductUsage> => {
      const plan = await planFrom(store, userId);
      const used = await store.countMonitoredProducts(userId);
      const limit = plan.limits.monitoredProducts;
      if (used + adding > limit) throw monitoredLimitError(plan, used);
      return { used, limit, remaining: Math.max(0, limit - used) };
    },

    /**
     * Race-safe version of assertCanMonitorProducts. Under the user's billing lock, re-count the
     * monitored products, throw BillingLimitError if `adding` more would pass the limit, else run
     * `write(tx)` in the same transaction and return its result. `write` must insert or update
     * sg_monitoring_tasks through `tx`, so the next caller's count sees it. If `write` throws,
     * the transaction rolls back. `adding` may be 0 or negative for an edit that removes URLs.
     */
    reserveMonitoredProducts: <T>(
      userId: string,
      adding: number,
      write: (tx: BillingTransaction) => Promise<T>,
    ): Promise<{ result: T; usage: MonitoredProductUsage }> =>
      store.withUserLock(userId, async (locked, tx) => {
        const plan = await planFrom(locked, userId);
        const before = await locked.countMonitoredProducts(userId);
        const limit = plan.limits.monitoredProducts;
        if (adding > 0 && before + adding > limit) throw monitoredLimitError(plan, before);
        const result = await write(tx);
        const used = Math.max(0, before + adding);
        return { result, usage: { used, limit, remaining: Math.max(0, limit - used) } };
      }),
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
