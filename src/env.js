import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

/**
 * True while `next build` or `next lint` loads this file. Their environment is not the one the
 * server runs with, so runtime-only requirements are checked when the server starts instead.
 */
function isNextBuildOrLint() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return true;
  // The webpack compiler runs in a child process with its own argv.
  if (process.env.NEXT_PRIVATE_BUILD_WORKER === '1') return true;
  const bin = process.argv[1] ?? '';
  return /[\\/]next[\\/]dist[\\/]bin[\\/]next$/.test(bin) && ['build', 'lint'].includes(process.argv[2] ?? '');
}

/**
 * Production must say where the client IP comes from. Without CLIENT_IP_HEADER or
 * TRUSTED_PROXY_HOPS every request is "unknown" and per-IP auth rate limits are off.
 *
 * @param {Record<string, string | undefined>} source
 * @returns {string | null}
 */
export function clientIpSourceError(source) {
  if (source.NODE_ENV !== 'production') return null;
  if (source.CLIENT_IP_HEADER?.trim() || source.TRUSTED_PROXY_HOPS?.trim()) return null;
  return (
    '❌ Invalid environment variables: set CLIENT_IP_HEADER or TRUSTED_PROXY_HOPS in production. ' +
    'CLIENT_IP_HEADER names a header your edge always overwrites (fly-client-ip on Fly, ' +
    'cf-connecting-ip behind Cloudflare); TRUSTED_PROXY_HOPS is the number of proxies that append ' +
    'to X-Forwarded-For. Without either, auth rate limits cannot tell clients apart. See docs/auth.md.'
  );
}

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET: process.env.NODE_ENV === 'production' ? z.string() : z.string().optional(),
    AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
    AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url().optional(),
    // Client IP source for auth rate limits; production requires one (see clientIpSourceError).
    CLIENT_IP_HEADER: z.string().trim().min(1).optional(),
    TRUSTED_PROXY_HOPS: z.string().regex(/^\s*[1-9]\d*\s*$/, 'must be a positive integer').optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    REDIS_URL: z.string().min(1).optional(),
    MICROSERVICE_HOST: z.string().min(1),
    MICROSERVICE_PORT: z.string().min(1),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.string().min(1).optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    SMTP_SECURE: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    // Public base URL for redirects (Stripe Checkout/Portal). Falls back to NEXTAUTH_URL.
    APP_URL: z.string().url().optional(),
    // Billing is disabled (everyone on the free allowance) while STRIPE_SECRET_KEY is unset.
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID: z.string().min(1).optional(),
    BILLING_FREE_DISCOVERIES_PER_MONTH: z.coerce.number().int().min(0).default(2),
    BILLING_PRO_DISCOVERIES_PER_MONTH: z.coerce.number().int().min(0).default(50),
    BILLING_FREE_MONITORED_PRODUCTS: z.coerce.number().int().min(0).default(5),
    BILLING_PRO_MONITORED_PRODUCTS: z.coerce.number().int().min(0).default(200),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid eanv vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_CLIENT_ID: process.env.AUTH_GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_CLIENT_SECRET: process.env.AUTH_GOOGLE_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CLIENT_IP_HEADER: process.env.CLIENT_IP_HEADER,
    TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS,
    REDIS_URL: process.env.REDIS_URL,
    MICROSERVICE_HOST: process.env.MICROSERVICE_HOST,
    MICROSERVICE_PORT: process.env.MICROSERVICE_PORT,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_SECURE: process.env.SMTP_SECURE,
    EMAIL_FROM: process.env.EMAIL_FROM,
    APP_URL: process.env.APP_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    BILLING_FREE_DISCOVERIES_PER_MONTH: process.env.BILLING_FREE_DISCOVERIES_PER_MONTH,
    BILLING_PRO_DISCOVERIES_PER_MONTH: process.env.BILLING_PRO_DISCOVERIES_PER_MONTH,
    BILLING_FREE_MONITORED_PRODUCTS: process.env.BILLING_FREE_MONITORED_PRODUCTS,
    BILLING_PRO_MONITORED_PRODUCTS: process.env.BILLING_PRO_MONITORED_PRODUCTS,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

if (!skipValidation && !isNextBuildOrLint()) {
  const clientIpError = clientIpSourceError(process.env);
  if (clientIpError) throw new Error(clientIpError);
}
