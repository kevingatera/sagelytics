import { env } from '~/env';

import type { BillingLimits } from './plans';

export interface BillingConfig {
  /** True when STRIPE_SECRET_KEY is set. When false everyone is on the free plan. */
  enabled: boolean;
  webhookSecret: string | null;
  priceId: string | null;
  /** Base URL for Checkout/Portal redirects: APP_URL, else NEXTAUTH_URL. */
  appUrl: string | null;
  limits: BillingLimits;
}

/** Read on every call so tests (and env reloads) see the current values. */
export function getBillingConfig(): BillingConfig {
  return {
    enabled: Boolean(env.STRIPE_SECRET_KEY),
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

/** Checkout needs a key, a price and a redirect base; the portal needs a key and a base. */
export function checkoutUnavailableReason(config: BillingConfig): string | null {
  if (!config.enabled) return 'billing not configured';
  if (!config.priceId) return 'billing not configured: STRIPE_PRICE_ID is unset';
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
