import { db } from '~/server/db';

import { getBillingConfig } from './config';
import { createBillingService } from './service';
import { createDrizzleBillingStore } from './store';

export { BillingLimitError, isBillingLimitError } from './errors';
export { BillingNotConfiguredError } from './stripe';
export type { PlanInfo, PlanName, PlanLimits } from './plans';
export type { DiscoveryUsage, MonitoredProductUsage } from './service';

export const billingStore = createDrizzleBillingStore(db);

// Logs a warning naming any missing Stripe variable when billing is only partly configured.
getBillingConfig();

const billing = createBillingService({ store: billingStore, config: getBillingConfig });

export const getPlanForUser = billing.getPlanForUser;
export const getDiscoveryUsage = billing.getDiscoveryUsage;
export const assertCanRunDiscovery = billing.assertCanRunDiscovery;
export const recordDiscoveryUsage = billing.recordDiscoveryUsage;
export const releaseDiscoveryUsage = billing.releaseDiscoveryUsage;
export const getMonitoredProductUsage = billing.getMonitoredProductUsage;
export const assertCanMonitorProducts = billing.assertCanMonitorProducts;

export function isBillingEnabled(): boolean {
  return getBillingConfig().enabled;
}
