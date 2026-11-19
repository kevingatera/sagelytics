# Billing

Sagelytics has a free tier and one paid plan ("pro"), billed through Stripe Checkout and the Stripe Billing Portal. This doc covers turning billing on and how allowances work.

## How allowances work

- Competitor discovery is the metered operation, because each run makes paid LLM and SERP calls.
- Each run writes one row to `sg_usage_event` (`kind = 'discovery'`). Usage is a `COUNT` over the current period. There is no counter to drift.
- Free users are metered per calendar month in UTC. Pro users are metered over their Stripe billing period.
- Monitored products are a standing cap, not a periodic one: the sum of `product_urls` across the user's `sg_monitoring_tasks`.
- Plan resolution (`src/server/billing/plans.ts`):
  - no `sg_billing_subscription` row, or no subscription: free
  - `active` or `trialing`: pro
  - `past_due` or `canceled`: pro until `current_period_end`, then free
  - `incomplete`, `incomplete_expired`, `unpaid`, `paused`: free
- With `STRIPE_SECRET_KEY` unset, billing is off. Everyone gets the free allowance, `/api/billing/checkout` and `/api/billing/portal` answer `503 {"error":"billing not configured"}`, and the webhook answers 503.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BILLING_FREE_DISCOVERIES_PER_MONTH` | 2 | Free discoveries per calendar month |
| `BILLING_PRO_DISCOVERIES_PER_MONTH` | 50 | Pro discoveries per Stripe period |
| `BILLING_FREE_MONITORED_PRODUCTS` | 5 | Free monitored product URLs |
| `BILLING_PRO_MONITORED_PRODUCTS` | 200 | Pro monitored product URLs |

The price comes from Stripe (`STRIPE_PRICE_ID`). The app holds no amounts.

### Race safety

`recordDiscoveryUsage` re-counts and inserts inside one transaction that holds `pg_advisory_xact_lock(<billing namespace>, hashtext(user_id))`. Concurrent discoveries for the same user queue on that lock, so at most `limit` of them pass. An advisory lock rather than `SELECT ... FOR UPDATE` because free users have no `sg_billing_subscription` row to lock, and creating one just to lock it would make a row mean "has a Stripe customer" only sometimes. The lock is released on commit or rollback, so a crashed request cannot leave it held. `assertCanRunDiscovery` is an unlocked pre-check for an early 402; the reservation is the real gate. See [wip/billing-wiring.md](wip/billing-wiring.md) for the call sites.

## Turn billing on

### 1. Create the product and price (test mode first)

In the Stripe dashboard, switch to test mode, then **Product catalog → Add product**: one product ("Sagelytics Pro") with one recurring price. Copy the price id (`price_...`).

Or with the Stripe CLI:

```sh
stripe products create --name "Sagelytics Pro"
stripe prices create --product <prod_id> --currency usd --unit-amount <cents> --recurring.interval month
```

### 2. Set environment variables

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` (later `sk_live_...`), or a restricted key with write access to Customers, Checkout Sessions, Billing Portal sessions, and read access to Subscriptions |
| `STRIPE_PRICE_ID` | The `price_...` id from step 1 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 4 or 5 |
| `APP_URL` | Public origin, for example `https://staging.sagelytics.example`. Falls back to `NEXTAUTH_URL` |

On Fly: `fly secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_ID=... STRIPE_WEBHOOK_SECRET=... APP_URL=... -a <web-app>`. Never commit these.

### 3. Apply the schema

Billing adds `sg_billing_subscription`, `sg_usage_event` and `sg_stripe_event` (`drizzle/0002_billing.sql`). Existing databases: back up, then `pnpm db:migrate`. Fresh databases: `pnpm db:push`, as in [deploy.md](deploy.md#apply-the-database-schema).

### 4. Local webhooks

```sh
stripe login
stripe listen --forward-to http://localhost:<port>/api/stripe/webhook
```

`stripe listen` prints a `whsec_...` signing secret. Put it in `STRIPE_WEBHOOK_SECRET` and restart the app. Trigger a test with `stripe trigger checkout.session.completed`, or run a real test checkout with card `4242 4242 4242 4242`.

### 5. Staging webhook endpoint (Fly)

Dashboard **Developers → Webhooks → Add endpoint**:

- URL: `https://<staging-origin>/api/stripe/webhook`
- API version: `2025-07-30.basil` (matches `STRIPE_API_VERSION` in `src/server/billing/stripe.ts`)
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` on the staging app. Each environment (local CLI, staging, production) has its own secret.

### 6. Customer portal

Dashboard **Settings → Billing → Customer portal**:

- Allow customers to update payment methods and view invoices.
- Allow cancellation, set to "at end of billing period" (the app shows `cancelAtPeriodEnd`).
- Leave plan switching off: there is one plan.
- Set the default return URL to `https://<origin>/settings?tab=billing`.

Save it in test mode and again in live mode; the two are configured separately.

### 7. Check it

1. Sign in, `POST /api/billing/checkout`, open the returned `url`, pay with `4242 4242 4242 4242`.
2. Stripe redirects to `/settings?tab=billing&checkout=success`.
3. `billing.getStatus` returns `plan: 'pro'` once the webhook lands.
4. `POST /api/billing/portal`, cancel, confirm `cancelAtPeriodEnd: true`.

## API

| Endpoint | Auth | Result |
| --- | --- | --- |
| `POST /api/billing/checkout` | session | `{ url }`; 409 if already subscribed; 503 if not configured |
| `POST /api/billing/portal` | session | `{ url }`; 409 if the user has no Stripe customer; 503 if not configured |
| `POST /api/stripe/webhook` | Stripe signature | `{ received, outcome: 'processed' \| 'duplicate' }`; 400 on a bad signature; 500 makes Stripe retry |
| tRPC `billing.getStatus` | session | `billingEnabled`, `plan`, `status`, `limits`, `periodStart`, `periodEnd`, `cancelAtPeriodEnd`, `usage.discoveries`, `usage.monitoredProducts` |

## Webhook behavior

- The signature is checked against the raw body. There is no middleware, so nothing in front of the route needs an exception.
- Each event id is inserted into `sg_stripe_event` in the same transaction as its writes. A redelivery is answered `duplicate`; a failure rolls back both so Stripe's retry reprocesses.
- Subscription state is re-read from Stripe (`subscriptions.retrieve`), not taken from the payload, so out-of-order deliveries settle on Stripe's current state.
- The user comes from our own customer link (`sg_billing_subscription.stripe_customer_id`) or from `client_reference_id`/`subscription.metadata.userId`, which only our server sets at checkout. A payload can never move a linked customer to another user.

## Tests

`pnpm test` mocks Stripe at the module boundary and never calls the network. The real-Postgres tests in `src/server/billing/store.pg.test.ts` (advisory-lock concurrency, webhook idempotency) are skipped unless `BILLING_TEST_DATABASE_URL` points at a migrated, disposable database:

```sh
BILLING_TEST_DATABASE_URL=postgresql://.../sagelytics_billing pnpm vitest run src/server/billing/store.pg.test.ts
```
