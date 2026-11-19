import {
  billingUrl,
  checkoutUnavailableReason,
  portalUnavailableReason,
  type BillingConfig,
} from './config';
import { isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import type { BillingStore } from './store';

export interface CheckoutDeps {
  stripe: () => StripeClient;
  store: BillingStore;
  config: BillingConfig;
}

export interface BillingUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export type BillingRedirectResult =
  | { ok: true; url: string }
  | { ok: false; status: 409 | 503; error: string };

/**
 * Return the user's Stripe customer id, creating the customer on first use. The idempotency key
 * makes concurrent first checkouts share one customer; the insert keeps whichever link landed
 * first and we re-read it.
 */
export async function ensureCustomer(
  user: BillingUser,
  deps: Pick<CheckoutDeps, 'stripe' | 'store'>,
): Promise<string> {
  const existing = await deps.store.getSubscription(user.id);
  if (existing) return existing.stripeCustomerId;

  const customer = await deps.stripe().customers.create(
    {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    },
    { idempotencyKey: `sagelytics-customer-${user.id}` },
  );
  await deps.store.linkCustomer(user.id, customer.id);
  const linked = await deps.store.getSubscription(user.id);
  return linked?.stripeCustomerId ?? customer.id;
}

export async function createCheckoutSession(
  user: BillingUser,
  deps: CheckoutDeps,
): Promise<BillingRedirectResult> {
  const unavailable = checkoutUnavailableReason(deps.config);
  if (unavailable) return { ok: false, status: 503, error: unavailable };

  const current = await deps.store.getSubscription(user.id);
  if (current && isPaidSubscription(current, new Date())) {
    return {
      ok: false,
      status: 409,
      error: 'already subscribed; use the billing portal to manage the plan',
    };
  }

  const customerId = await ensureCustomer(user, deps);
  const session = await deps.stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: deps.config.priceId!, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: billingUrl(deps.config, {
      checkout: 'success',
      session_id: '{CHECKOUT_SESSION_ID}',
    }),
    cancel_url: billingUrl(deps.config, { checkout: 'cancelled' }),
  });
  if (!session.url)
    return { ok: false, status: 503, error: 'Stripe did not return a checkout URL' };
  return { ok: true, url: session.url };
}

export async function createPortalSession(
  user: BillingUser,
  deps: CheckoutDeps,
): Promise<BillingRedirectResult> {
  const unavailable = portalUnavailableReason(deps.config);
  if (unavailable) return { ok: false, status: 503, error: unavailable };

  const existing = await deps.store.getSubscription(user.id);
  if (!existing)
    return { ok: false, status: 409, error: 'no billing account yet; start a checkout first' };

  const session = await deps.stripe().billingPortal.sessions.create({
    customer: existing.stripeCustomerId,
    return_url: billingUrl(deps.config, {}),
  });
  return { ok: true, url: session.url };
}
