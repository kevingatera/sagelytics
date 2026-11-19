# Billing

Sagelytics has a free tier and one paid plan ("pro"), billed through Stripe Checkout and the Stripe Billing Portal. This doc covers turning billing on and how allowances work.

## How allowances work

- Competitor discovery is the metered operation, because each run makes paid LLM and SERP calls.
- Each run writes one row to `sg_usage_event` (`kind = 'discovery'`). Usage is a `COUNT` over the current period. There is no counter to drift.
- Free users are metered per calendar month in UTC. Pro users are metered over their Stripe billing period.
- Monitored products are a standing cap, not a periodic one: the sum of `product_urls` across the user's `sg_monitoring_tasks`.
- Plan resolution (`src/server/billing/plans.ts`):
  - no `sg_billing_subscription` row, or no subscription: free
  - `active`, `trialing` or `past_due`: pro until `current_period_end` plus a 3-day grace, then free. The grace covers a renewal webhook that lands late. A row with no known period end is free.
  - `canceled`: pro until `current_period_end`, then free (no grace)
  - `incomplete`, `incomplete_expired`, `unpaid`, `paused`: free
  - Inside the grace window, usage is counted over the calendar month, because the Stripe period has ended.
- Billing is on only when `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` are all set. If any is missing, billing is off: everyone gets the free allowance, `/api/billing/checkout` and `/api/billing/portal` answer `503 {"error":"billing not configured"}`, and the webhook answers 503. With some set but not all, the server logs `[BILLING] Billing is disabled: partial Stripe config, missing <NAMES>` once. It logs the names only, never the values. Checkout without the webhook secret would take payments the app never records.

| Variable | Default | Meaning |
| --- | --- | --- |
| `BILLING_FREE_DISCOVERIES_PER_MONTH` | 2 | Free discoveries per calendar month |
| `BILLING_PRO_DISCOVERIES_PER_MONTH` | 50 | Pro discoveries per Stripe period |
| `BILLING_FREE_MONITORED_PRODUCTS` | 5 | Free monitored product URLs |
| `BILLING_PRO_MONITORED_PRODUCTS` | 200 | Pro monitored product URLs |

The price comes from Stripe (`STRIPE_PRICE_ID`). The app holds no amounts.

### Race safety

`recordDiscoveryUsage` re-counts and inserts inside one transaction that holds `pg_advisory_xact_lock(<billing namespace>, hashtext(user_id))`. It reads the clock once, after it has the lock, and uses that instant both to pick the period and as the row's `created_at`. Without that, a reservation made just before a period boundary could be checked against one period and counted in the next. Concurrent discoveries for the same user queue on that lock, so at most `limit` of them pass. An advisory lock rather than `SELECT ... FOR UPDATE` because free users have no `sg_billing_subscription` row to lock, and creating one just to lock it would make a row mean "has a Stripe customer" only sometimes. The lock is released on commit or rollback, so a crashed request cannot leave it held. `assertCanRunDiscovery` is an unlocked pre-check for an early 402; the reservation is the real gate. See [wip/billing-wiring.md](wip/billing-wiring.md) for the call sites.

Monitored products work the same way. `assertCanMonitorProducts(userId, adding)` is an unlocked check, so two concurrent requests can both pass it. `reserveMonitoredProducts(userId, adding, write)` is exact. Under the user's lock it re-counts, throws `BillingLimitError` if `adding` more would pass the limit, then runs `write(tx)` in the same transaction and returns `{ result, usage }`. `write` must create or update `sg_monitoring_tasks` through `tx`; if it throws, everything rolls back. Pass a zero or negative `adding` for edits that remove URLs.

```ts
import { reserveMonitoredProducts } from '~/server/billing';

const { result: task } = await reserveMonitoredProducts(userId, productUrls.length, (tx) =>
  tx.insert(monitoringTasks).values({ userId, productUrls, ... }).returning(),
);
```

The same lock serializes checkout and webhook events for a user (see below).

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
| `STRIPE_SECRET_KEY` | `sk_test_...` (later `sk_live_...`), or a restricted key with write access to Customers, Checkout Sessions, Billing Portal sessions, Subscriptions (to cancel a duplicate), Invoices (to void one) and Refunds |
| `STRIPE_PRICE_ID` | The `price_...` id from step 1 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 4 or 5 |
| `APP_URL` | Public origin, for example `https://staging.sagelytics.example`. Falls back to `NEXTAUTH_URL` |

On Fly: `fly secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_ID=... STRIPE_WEBHOOK_SECRET=... APP_URL=... -a <web-app>`. Never commit these.

### 3. Apply the schema

Billing adds `sg_billing_subscription`, `sg_usage_event` and `sg_stripe_event` (`drizzle/0002_billing.sql`), plus the checkout-session columns on `sg_billing_subscription` (`checkout_session_id`, `checkout_session_expires_at`, `checkout_attempt`). Existing databases: back up, then `pnpm db:migrate`. Fresh databases: `pnpm db:push`, as in [deploy.md](deploy.md#apply-the-database-schema).

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
| `POST /api/billing/checkout` | session | `{ url }`; 409 `{ error, portalUrl }` if already subscribed; 503 if not configured |
| `POST /api/billing/portal` | session | `{ url }`; 409 if the user has no Stripe customer; 503 if not configured |
| `POST /api/stripe/webhook` | Stripe signature | `{ received, outcome: 'processed' \| 'duplicate' }`; 400 on a bad signature; 500 makes Stripe retry |
| tRPC `billing.getStatus` | session | `billingEnabled`, `plan`, `status`, `limits`, `periodStart`, `periodEnd`, `cancelAtPeriodEnd`, `usage.discoveries`, `usage.monitoredProducts` |

## Checkout behavior

Two open Checkout Sessions could both be paid, leaving a customer with two subscriptions. `createCheckoutSession` prevents that, all under the user's billing lock:

1. A user with a live subscription gets 409 and a `portalUrl`. Live means pro by the rules above, or a status Stripe can still bill: `active`, `trialing`, `past_due`, `unpaid` or `paused`. Stripe's subscription list for the customer is checked too, in case a webhook was missed.
2. The open session is stored on `sg_billing_subscription` (`checkout_session_id`, `checkout_session_expires_at`). While Stripe reports it `open` with more than 2 minutes left, the same URL is returned. If it is about to expire, it is expired first. A `complete` session (paid, webhook not landed yet) gets 409.
3. Otherwise a new session is created with `expires_at` at Stripe's 30-minute minimum (plus one minute of clock margin). The idempotency key is `sagelytics-checkout-<userId>-<attempt>`; `checkout_attempt` counts up per new session.

Backstop: when `checkout.session.completed` arrives for a customer who already has an older `active`, `trialing` or `past_due` subscription, the new subscription is canceled at once without proration. Its first invoice is refunded in full, or voided if still unpaid. The server logs `[BILLING] ALERT: duplicate subscription canceled and refunded`. The oldest subscription is always kept, whatever order the events arrive in.

## Webhook behavior

- The signature is checked against the raw body. There is no middleware, so nothing in front of the route needs an exception.
- Each event id is inserted into `sg_stripe_event` in the same transaction as its writes. A redelivery is answered `duplicate`; a failure rolls back both so Stripe's retry reprocesses.
- Subscription state is re-read from Stripe (`subscriptions.retrieve`), not taken from the payload. The re-read and the write happen inside the event transaction, which first takes the owning user's billing lock. Events for one user apply one at a time, and each reads Stripe after the previous one committed. A slow read of an old state can never be written after a newer one.
- The lock user is the one linked to the event's customer. If the customer is not linked yet, it is the `client_reference_id` or `metadata.userId` that our server wrote at checkout.
- The user comes from our own customer link (`sg_billing_subscription.stripe_customer_id`) or from `client_reference_id`/`subscription.metadata.userId`, which only our server sets at checkout. A payload can never move a linked customer to another user.

## Tests

`pnpm test` mocks Stripe at the module boundary and never calls the network. The real-Postgres tests in `src/server/billing/store.pg.test.ts` are skipped unless `BILLING_TEST_DATABASE_URL` points at a migrated, disposable database. They cover advisory-lock concurrency, webhook idempotency, events serialized under the lock, the stored checkout session, the usage timestamp and monitored-product reservations. Create the schema with `pnpm db:push --force` against that database first.

```sh
BILLING_TEST_DATABASE_URL=postgresql://.../sagelytics_billing pnpm vitest run src/server/billing/store.pg.test.ts
```
