import { billingStore, type BillingTransaction } from '~/server/billing';
import { createBillingService, type BillingService } from '~/server/billing/service';
import { getBillingConfig } from '~/server/billing/config';

// URL replacements and partial onboarding inserts determine their size from locked state.
export function withMonitoringCapacity<T>(
  userId: string,
  write: (tx: BillingTransaction, billing: BillingService) => Promise<T>,
): Promise<T> {
  return billingStore.withUserLock(userId, (store, tx) =>
    write(tx, createBillingService({ store, config: getBillingConfig })),
  );
}
