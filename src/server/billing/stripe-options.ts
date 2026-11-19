import type Stripe from 'stripe';

// No runtime imports: scripts/maintenance runs this file with plain Node.

/** Pinned so a dashboard default change cannot alter webhook payload shapes under us. */
export const STRIPE_API_VERSION = '2025-07-30.basil' satisfies Stripe.LatestApiVersion;

/**
 * Billing code holds a pool connection, and sometimes a user's billing lock, across Stripe calls.
 * The SDK default (80 s, 2 retries) could hold both for minutes, so every request is cut off
 * after 10 s and retried at most once.
 */
export const STRIPE_TIMEOUT_MS = 10_000;
export const STRIPE_MAX_NETWORK_RETRIES = 1;
