import { afterEach, describe, expect, it, vi } from 'vitest';

const ctor = vi.hoisted(() => vi.fn());
vi.mock('~/env', () => ({ env: { STRIPE_SECRET_KEY: 'sk_test_placeholder' } }));
vi.mock('stripe', () => ({
  default: class {
    constructor(...args: unknown[]) {
      ctor(...args);
    }
  },
}));

import { getStripe } from './stripe';

afterEach(() => ctor.mockClear());

describe('getStripe', () => {
  it('bounds every request at 10 s with at most one retry', () => {
    getStripe();
    expect(ctor).toHaveBeenCalledWith(
      'sk_test_placeholder',
      expect.objectContaining({ timeout: 10_000, maxNetworkRetries: 1 }),
    );
  });
});
