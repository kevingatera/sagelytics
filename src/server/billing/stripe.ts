import Stripe from 'stripe';

import { env } from '~/env';

import {
  STRIPE_API_VERSION,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_TIMEOUT_MS,
} from './stripe-options';

export { STRIPE_API_VERSION };

export class BillingNotConfiguredError extends Error {
  constructor(message = 'billing not configured') {
    super(message);
    this.name = 'BillingNotConfiguredError';
  }
}

/** The slice of the Stripe SDK billing uses. Tests supply a fake with the same shape. */
export interface StripeClient {
  webhooks: Pick<Stripe['webhooks'], 'constructEvent'>;
  customers: Pick<Stripe['customers'], 'create'>;
  subscriptions: Pick<Stripe['subscriptions'], 'retrieve' | 'list' | 'cancel'>;
  invoices: Pick<Stripe['invoices'], 'retrieve' | 'voidInvoice' | 'list'>;
  refunds: Pick<Stripe['refunds'], 'create' | 'retrieve' | 'list'>;
  checkout: { sessions: Pick<Stripe['checkout']['sessions'], 'create' | 'retrieve' | 'expire'> };
  billingPortal: { sessions: Pick<Stripe['billingPortal']['sessions'], 'create'> };
}

let client: Stripe | null = null;
let clientKey: string | null = null;

/** Lazily build the Stripe client. Nothing touches Stripe until a billing route needs it. */
export function getStripe(): StripeClient {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfiguredError();
  if (!client || clientKey !== key) {
    client = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: { name: 'sagelytics' },
      timeout: STRIPE_TIMEOUT_MS,
      maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
    });
    clientKey = key;
  }
  return client;
}
