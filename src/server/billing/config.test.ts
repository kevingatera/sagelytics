import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({}) as Record<string, string | number | undefined>);
vi.mock('~/env', () => ({ env }));

import { checkoutUnavailableReason, getBillingConfig, portalUnavailableReason } from './config';

const FULL = {
  STRIPE_SECRET_KEY: 'sk_test_value_must_not_be_logged',
  STRIPE_PRICE_ID: 'price_value_must_not_be_logged',
  STRIPE_WEBHOOK_SECRET: 'whsec_value_must_not_be_logged',
  APP_URL: 'https://app.example',
  BILLING_FREE_DISCOVERIES_PER_MONTH: 2,
  BILLING_PRO_DISCOVERIES_PER_MONTH: 50,
  BILLING_FREE_MONITORED_PRODUCTS: 5,
  BILLING_PRO_MONITORED_PRODUCTS: 200,
};

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  Object.assign(env, FULL);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  warn.mockClear();
});

function warnings(): string {
  return warn.mock.calls.map((call) => call.join(' ')).join('\n');
}

describe('getBillingConfig', () => {
  it('enables billing only when key, price and webhook secret are all set', () => {
    const config = getBillingConfig();
    expect(config.enabled).toBe(true);
    expect(checkoutUnavailableReason(config)).toBeNull();
    expect(portalUnavailableReason(config)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'])(
    'disables billing and names %s (never a value) when it alone is missing',
    (name) => {
      delete env[name];
      const config = getBillingConfig();
      expect(config.enabled).toBe(false);
      expect(checkoutUnavailableReason(config)).toBe('billing not configured');
      expect(portalUnavailableReason(config)).toBe('billing not configured');

      const logged = warnings();
      expect(logged).toContain(`missing ${name}`);
      expect(logged).not.toContain('value_must_not_be_logged');
    },
  );

  it('warns once per distinct missing set, not on every call', () => {
    delete env.STRIPE_WEBHOOK_SECRET;
    delete env.STRIPE_PRICE_ID;
    getBillingConfig();
    getBillingConfig();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warnings()).toContain('missing STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET');
  });

  it('stays quiet when no Stripe variable is set (plain free mode)', () => {
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_PRICE_ID;
    delete env.STRIPE_WEBHOOK_SECRET;
    expect(getBillingConfig().enabled).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
