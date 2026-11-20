import type Stripe from 'stripe';

import {
  billingUrl,
  checkoutUnavailableReason,
  portalUnavailableReason,
  type BillingConfig,
} from './config';
import { BillingLockBusyError } from './errors';
import { isLiveSubscriptionStatus, isPaidSubscription } from './plans';
import type { StripeClient } from './stripe';
import type { BillingStore } from './store';

export interface CheckoutDeps {
  stripe: () => StripeClient;
  store: BillingStore;
  config: BillingConfig;
  now?: () => Date;
}

export interface BillingUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export type BillingRedirectResult =
  | { ok: true; url: string }
  | { ok: false; status: 409 | 503; error: string; portalUrl?: string };

/**
 * Stripe's minimum Checkout Session lifetime is 30 minutes from creation. One extra minute keeps a
 * slightly slow local clock from asking for less than that.
 */
export const CHECKOUT_SESSION_TTL_MS = 31 * 60 * 1000;
/** An open session closer than this to expiry is expired and replaced rather than handed out. */
const CHECKOUT_REUSE_MIN_REMAINING_MS = 2 * 60 * 1000;

const ALREADY_SUBSCRIBED = 'already subscribed; use the billing portal to manage the plan';
export const CHECKOUT_IN_PROGRESS = 'checkout already in progress';

/**
 * Checkout holds the user's billing lock (and a pool connection) while it talks to Stripe, so
 * every Stripe call in it is bounded: one try plus one retry, each cut off after this long.
 */
export const CHECKOUT_STRIPE_TIMEOUT_MS = 8_000;
export const CHECKOUT_STRIPE_REQUEST: Stripe.RequestOptions = {
  timeout: CHECKOUT_STRIPE_TIMEOUT_MS,
  maxNetworkRetries: 1,
};

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
    { ...CHECKOUT_STRIPE_REQUEST, idempotencyKey: `sagelytics-customer-${user.id}` },
  );
  await deps.store.linkCustomer(user.id, customer.id);
  const linked = await deps.store.getSubscription(user.id);
  return linked?.stripeCustomerId ?? customer.id;
}

function isIdempotencyError(error: unknown): boolean {
  return (error as { type?: unknown } | null)?.type === 'StripeIdempotencyError';
}

function isMissingResource(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'resource_missing';
}

async function portalUrlFor(customerId: string, deps: CheckoutDeps): Promise<string | undefined> {
  try {
    const session = await deps
      .stripe()
      .billingPortal.sessions.create(
        { customer: customerId, return_url: billingUrl(deps.config, {}) },
        CHECKOUT_STRIPE_REQUEST,
      );
    return session.url;
  } catch (error) {
    console.warn('[BILLING] Could not open the portal for an already-subscribed user:', error);
    return undefined;
  }
}

/**
 * Start (or resume) a subscription checkout. Everything runs under the user's billing lock, so
 * two clicks cannot both create sessions. A user who already has a live subscription is sent to
 * the portal; a user with an open session gets that session back. Only one session per user is
 * ever open, and each one dies after Stripe's minimum lifetime. A request that finds the lock
 * held (another checkout, or a webhook for this user) gets 409 at once instead of queueing on a
 * pool connection.
 */
export async function createCheckoutSession(
  user: BillingUser,
  deps: CheckoutDeps,
): Promise<BillingRedirectResult> {
  const unavailable = checkoutUnavailableReason(deps.config);
  if (unavailable) return { ok: false, status: 503, error: unavailable };

  try {
    return await checkoutUnderLock(user, deps);
  } catch (error) {
    if (error instanceof BillingLockBusyError) {
      return { ok: false, status: 409, error: CHECKOUT_IN_PROGRESS };
    }
    throw error;
  }
}

function checkoutUnderLock(user: BillingUser, deps: CheckoutDeps): Promise<BillingRedirectResult> {
  return deps.store.withUserLock(
    user.id,
    async (store) => {
      const now = (deps.now ?? (() => new Date()))();
      const stripe = deps.stripe();
      const refuse = async (customerId: string, error = ALREADY_SUBSCRIBED) =>
        ({
          ok: false,
          status: 409,
          error,
          portalUrl: await portalUrlFor(customerId, deps),
        }) as const;

      const current = await store.getSubscription(user.id);
      if (
        current &&
        (isPaidSubscription(current, now) || isLiveSubscriptionStatus(current.status))
      ) {
        return refuse(current.stripeCustomerId);
      }

      const open = current?.checkoutSessionId
        ? await stripe.checkout.sessions
            .retrieve(current.checkoutSessionId, {}, CHECKOUT_STRIPE_REQUEST)
            .catch((error: unknown) => {
              // Gone from Stripe (for example a test-mode reset): nothing left that could be paid.
              if (isMissingResource(error)) return null;
              throw error;
            })
        : null;
      if (current?.checkoutSessionId && !open) {
        await store.clearCheckoutSession(user.id, current.checkoutSessionId);
      }
      if (current && open) {
        if (open.status === 'complete') {
          // Paid, but the webhook has not landed yet. A new session could be paid a second time.
          return refuse(
            current.stripeCustomerId,
            'checkout already completed; your plan updates in a moment',
          );
        }
        if (open.status === 'open') {
          const remaining = open.expires_at * 1000 - now.getTime();
          if (open.url && remaining > CHECKOUT_REUSE_MIN_REMAINING_MS) {
            return { ok: true, url: open.url } as const;
          }
          // About to expire: close it so it cannot be paid alongside its replacement.
          await stripe.checkout.sessions.expire(open.id, {}, CHECKOUT_STRIPE_REQUEST);
        }
        await store.clearCheckoutSession(user.id, open.id);
      }

      if (current) {
        // Our row can lag Stripe (missed webhook, link made by an older deploy). Ask Stripe directly.
        const { data } = await stripe.subscriptions.list(
          { customer: current.stripeCustomerId, status: 'all', limit: 20 },
          CHECKOUT_STRIPE_REQUEST,
        );
        if (data.some((sub) => isLiveSubscriptionStatus(sub.status))) {
          return refuse(current.stripeCustomerId);
        }
      }

      const customerId = await ensureCustomer(user, { stripe: deps.stripe, store });
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: deps.config.priceId!, quantity: 1 }],
        subscription_data: { metadata: { userId: user.id } },
        allow_promotion_codes: true,
        expires_at: Math.floor((now.getTime() + CHECKOUT_SESSION_TTL_MS) / 1000),
        success_url: billingUrl(deps.config, {
          checkout: 'success',
          session_id: '{CHECKOUT_SESSION_ID}',
        }),
        cancel_url: billingUrl(deps.config, { checkout: 'cancelled' }),
      };

      let attempt = (current?.checkoutAttempt ?? 0) + 1;
      const create = () =>
        stripe.checkout.sessions.create(params, {
          ...CHECKOUT_STRIPE_REQUEST,
          idempotencyKey: `sagelytics-checkout-${user.id}-${attempt}`,
        });
      let session: Stripe.Checkout.Session;
      try {
        session = await create();
      } catch (error) {
        // A rolled-back earlier call already used this attempt number with other params.
        if (!isIdempotencyError(error)) throw error;
        attempt += 1;
        session = await create();
      }
      if (!session.url) {
        return { ok: false, status: 503, error: 'Stripe did not return a checkout URL' } as const;
      }
      await store.saveCheckoutSession(user.id, {
        id: session.id,
        expiresAt: new Date(session.expires_at * 1000),
        attempt,
      });
      return { ok: true, url: session.url } as const;
    },
    { noWait: true },
  );
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
