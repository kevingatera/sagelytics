#!/usr/bin/env node
// Fill sg_billing_subscription.paid_period_* for past_due, canceled and unpaid rows that
// migration 0009 left empty, from each subscription's latest paid invoice in Stripe.
//
// Dry run by default: prints what it would write. Pass --apply to write.
//
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --apply
//
// With --duplicates it also settles every open duplicate-subscription refund
// (sg_billing_duplicate_refund), for rows whose webhook Stripe stopped retrying. The dry run only
// lists them. With --apply it runs the webhook's own settlement, which can cancel the duplicate,
// void its open invoices (an unpaid checkout invoice, or renewals it made meanwhile) and refund
// its checkout invoice in Stripe. needs_attention rows are only read, never changed in Stripe.
//
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --duplicates
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --duplicates --apply
//
// Needs DATABASE_URL and STRIPE_SECRET_KEY, Node 22.18+ (it imports TypeScript from src) and
// the repo's node_modules. The paid-period resync only reads Stripe. Safe to run more than once.

import { register } from 'node:module';
import { parseArgs } from 'node:util';

import postgres from 'postgres';
import Stripe from 'stripe';

import { resyncPaidPeriods, sqlResyncStore } from '../../src/server/billing/paid-period.ts';
import {
  STRIPE_API_VERSION,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_TIMEOUT_MS,
} from '../../src/server/billing/stripe-options.ts';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    duplicates: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});
if (values.help) {
  console.log(
    'Usage: node --env-file=.env scripts/maintenance/resync-paid-periods.mjs [--duplicates] [--apply]',
  );
  process.exit(0);
}

const { DATABASE_URL, STRIPE_SECRET_KEY } = process.env;
if (!DATABASE_URL || !STRIPE_SECRET_KEY) {
  console.error('DATABASE_URL and STRIPE_SECRET_KEY must be set.');
  process.exit(2);
}

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => undefined });
// STRIPE_API_BASE (for example http://localhost:3131) points at a local fake for testing.
const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  ...(base && {
    host: base.hostname,
    port: Number(base.port) || undefined,
    protocol: base.protocol.replace(':', ''),
  }),
  apiVersion: STRIPE_API_VERSION,
  appInfo: { name: 'sagelytics-resync' },
  timeout: STRIPE_TIMEOUT_MS,
  maxNetworkRetries: STRIPE_MAX_NETWORK_RETRIES,
});

/**
 * The settlement code lives in app modules written for the bundler: `~/` imports, imports
 * without extensions, and a type-only `next-auth/adapters` import. Resolve those for plain Node.
 */
function registerSrcResolver() {
  const src = new URL('../../src/', import.meta.url).href;
  const hooks = `
    const src = ${JSON.stringify(src)};
    export async function resolve(specifier, context, next) {
      if (specifier === 'next-auth/adapters') return { url: 'stub:types-only', shortCircuit: true };
      if (specifier.startsWith('~/')) specifier = new URL(specifier.slice(2), src).href;
      try {
        return await next(specifier, context);
      } catch (error) {
        if (!/^(\\.|\\/|file:)/.test(specifier) || /\\.[cm]?[jt]s$/.test(specifier)) throw error;
        return next(specifier + '.ts', context);
      }
    }
    export async function load(url, context, next) {
      if (url === 'stub:types-only') return { format: 'module', source: '', shortCircuit: true };
      return next(url, context);
    }`;
  register(`data:text/javascript,${encodeURIComponent(hooks)}`);
}

async function settleDuplicates() {
  registerSrcResolver();
  const [{ drizzle }, schema, { createDrizzleBillingStore }, { settleOpenDuplicateRefunds }] =
    await Promise.all([
      import('drizzle-orm/postgres-js'),
      import('../../src/server/db/schema.ts'),
      import('../../src/server/billing/store.ts'),
      import('../../src/server/billing/webhook.ts'),
    ]);
  // Its own connection: Drizzle replaces a connection's Date serializer.
  const conn = postgres(DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    const store = createDrizzleBillingStore(drizzle(conn, { schema }));
    if (!values.apply) {
      const open = await store.listOpenDuplicateRefunds();
      for (const row of open) {
        console.log(
          [
            'would_settle'.padEnd(17),
            row.stripeSubscriptionId,
            row.stripeCustomerId,
            row.status,
            `attempts=${row.attempts}`,
            row.refundId ?? '',
            row.lastError ?? '',
          ]
            .join('  ')
            .trimEnd(),
        );
      }
      console.log(`${open.length} open duplicate refunds.`);
      return 0;
    }
    const results = await settleOpenDuplicateRefunds({ stripe, store });
    for (const row of results) {
      console.log(
        [row.settlement.padEnd(17), row.subscription, row.customer, row.status].join('  '),
      );
    }
    const count = (settlement) => results.filter((row) => row.settlement === settlement).length;
    console.log(
      `${results.length} open duplicate refunds: ${count('settled')} settled, ${count('in_flight')} with a refund in flight, ${count('contended')} moved by a webhook meanwhile, ${count('needs_attention')} need a person, ${count('owed')} still owed (Stripe error).`,
    );
    return count('owed');
  } finally {
    await conn.end();
  }
}

try {
  const results = await resyncPaidPeriods({
    stripe,
    store: sqlResyncStore(sql),
    apply: values.apply,
  });
  for (const row of results) {
    console.log(
      [
        row.action.padEnd(17),
        row.userId,
        row.stripeSubscriptionId,
        row.status,
        row.period ? `${row.period.start.toISOString()} -> ${row.period.end.toISOString()}` : '',
        row.error ?? '',
      ]
        .join('  ')
        .trimEnd(),
    );
  }
  const count = (action) => results.filter((row) => row.action === action).length;
  console.log(
    `${results.length} rows: ${count(values.apply ? 'updated' : 'would_update')} ${
      values.apply ? 'updated' : 'to update'
    }, ${count('no_paid_invoice')} without a paid invoice (stay free), ${count('changed_meanwhile')} changed meanwhile, ${count('error')} errors.`,
  );
  const owed = values.duplicates ? await settleDuplicates() : 0;
  if (!values.apply) console.log('Dry run. Re-run with --apply to write.');
  process.exitCode = count('error') > 0 || owed > 0 ? 1 : 0;
} finally {
  await sql.end();
}
