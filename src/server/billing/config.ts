import { env } from '~/env';

import type { BillingLimits } from './plans';

export interface BillingConfig {
  /**
   * True only when STRIPE_SECRET_KEY, STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET are all set.
   * When false everyone is on the free plan and checkout, portal and webhook answer 503.
   */
  enabled: boolean;
  webhookSecret: string | null;
  priceId: string | null;
  /** Base URL for Checkout/Portal redirects: APP_URL, else NEXTAUTH_URL. */
  appUrl: string | null;
  limits: BillingLimits;
}

/** Every variable billing needs. Checkout without the webhook secret would take money we never record. */
export const REQUIRED_BILLING_ENV = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID',
  'STRIPE_WEBHOOK_SECRET',
] as const;

export function missingBillingEnv(): string[] {
  return REQUIRED_BILLING_ENV.filter((name) => !env[name]);
}

let warnedFor: string | null = null;

/**
 * Warn once (per distinct set of missing names) when billing is partly configured. Logs names
 * only, never values. Nothing is logged when no Stripe variable is set: that is plain free mode.
 */
function warnOnPartialConfig(missing: string[]): void {
  if (missing.length === 0 || missing.length === REQUIRED_BILLING_ENV.length) return;
  const key = missing.join(',');
  if (warnedFor === key) return;
  warnedFor = key;
  console.warn(
    `[BILLING] Billing is disabled: partial Stripe config, missing ${missing.join(', ')}. ` +
      `Set all of ${REQUIRED_BILLING_ENV.join(', ')} to enable it.`,
  );
}

/** Read on every call so tests (and env reloads) see the current values. */
export function getBillingConfig(): BillingConfig {
  const missing = missingBillingEnv();
  warnOnPartialConfig(missing);
  return {
    enabled: missing.length === 0,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? null,
    priceId: env.STRIPE_PRICE_ID ?? null,
    appUrl: env.APP_URL ?? env.NEXTAUTH_URL ?? null,
    limits: {
      free: {
        discoveriesPerPeriod: env.BILLING_FREE_DISCOVERIES_PER_MONTH,
        monitoredProducts: env.BILLING_FREE_MONITORED_PRODUCTS,
      },
      pro: {
        discoveriesPerPeriod: env.BILLING_PRO_DISCOVERIES_PER_MONTH,
        monitoredProducts: env.BILLING_PRO_MONITORED_PRODUCTS,
      },
    },
  };
}

/** Checkout and the portal need full Stripe config plus a redirect base. */
export function checkoutUnavailableReason(config: BillingConfig): string | null {
  if (!config.enabled || !config.priceId || !config.webhookSecret) return 'billing not configured';
  if (!config.appUrl) return 'billing not configured: APP_URL (or NEXTAUTH_URL) is unset';
  return null;
}

export function portalUnavailableReason(config: BillingConfig): string | null {
  if (!config.enabled) return 'billing not configured';
  if (!config.appUrl) return 'billing not configured: APP_URL (or NEXTAUTH_URL) is unset';
  return null;
}

export function billingUrl(config: BillingConfig, query: Record<string, string>): string {
  const url = new URL('/settings', config.appUrl ?? 'http://localhost');
  url.searchParams.set('tab', 'billing');
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  // Stripe substitutes {CHECKOUT_SESSION_ID} literally, so keep the braces unescaped.
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}
