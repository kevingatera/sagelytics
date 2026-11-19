#!/usr/bin/env node
// Fill sg_billing_subscription.paid_period_* for past_due, canceled and unpaid rows that
// migration 0009 left empty, from each subscription's latest paid invoice in Stripe.
//
// Dry run by default: prints what it would write. Pass --apply to write.
//
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs
//   node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --apply
//
// Needs DATABASE_URL and STRIPE_SECRET_KEY, Node 22.18+ (it imports TypeScript from src) and
// the repo's node_modules. Only reads Stripe. Safe to run more than once.

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
    help: { type: 'boolean', default: false },
  },
});
if (values.help) {
  console.log('Usage: node --env-file=.env scripts/maintenance/resync-paid-periods.mjs [--apply]');
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
  if (!values.apply) console.log('Dry run. Re-run with --apply to write.');
  process.exitCode = count('error') > 0 ? 1 : 0;
} finally {
  await sql.end();
}
