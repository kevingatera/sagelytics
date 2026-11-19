# Billing

Sagelytics has a free tier and one paid plan ("pro"), billed through Stripe Checkout and the Stripe Billing Portal. This doc covers turning billing on and how allowances work.

## How allowances work

- Competitor discovery is the metered operation, because each run makes paid LLM and SERP calls.
- Each run writes one row to `sg_usage_event` (`kind = 'discovery'`). Usage is a `COUNT` over the current period. There is no counter to drift.
- Free users are metered per calendar month in UTC. Pro users are metered over their paid period: the service period of their latest paid invoice (or their trial).
- Monitored products are a standing cap, not a periodic one: the sum of `product_urls` across the user's `sg_monitoring_tasks`.
- Plan resolution (`src/server/billing/plans.ts`):
  - no `sg_billing_subscription` row, or no subscription: free
  - Pro is based on `paid_period_start`/`paid_period_end`, never `current_period_end`. Stripe advances `current_period_*` on renewal whether or not the renewal invoice is paid, so a failed renewal would otherwise grant a fresh, unpaid period.
  - `active`, `trialing` or `past_due`: pro until `paid_period_end` plus a 3-day grace, then free. The grace covers an `invoice.paid` webhook that lands late and a short dunning window. A row with no paid period is free.
  - `canceled`: pro until the earlier of `paid_period_end` and `current_period_end`, then free (no grace)
  - `incomplete`, `incomplete_expired`, `unpaid`, `paused`: free
  - Inside the grace window, usage is still counted from `paid_period_start`, with the window stretched to the end of the grace. An unpaid renewal never resets the allowance.
- The paid period comes from Stripe. A trial counts as paid for its own period. Otherwise it is the latest paid invoice's non-proration subscription line for that subscription: the `invoice.paid` payload, or `invoices.list({ subscription, status: 'paid' })` re-read on every subscription event. For the same subscription it never moves backwards, so a lagging read cannot undo a payment already seen.
- Billing is on only when `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `STRIPE_WEBHOOK_SECRET` are all set. If any is missing, billing is off: everyone gets the free allowance, `/api/billing/checkout` and `/api/billing/portal` answer `503 {"error":"billing not configured"}`, and the webhook answers 503. With some set but not all, the server logs `[BILLING] Billing is disabled: partial Stripe config, missing <NAMES>` once. It logs the names only, never the values. Checkout without the webhook secret would take payments the app never records.

| Variable                             | Default | Meaning                             |
| ------------------------------------ | ------- | ----------------------------------- |
| `BILLING_FREE_DISCOVERIES_PER_MONTH` | 2       | Free discoveries per calendar month |
| `BILLING_PRO_DISCOVERIES_PER_MONTH`  | 50      | Pro discoveries per Stripe period   |
| `BILLING_FREE_MONITORED_PRODUCTS`    | 5       | Free monitored product URLs         |
| `BILLING_PRO_MONITORED_PRODUCTS`     | 200     | Pro monitored product URLs          |

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

| Variable                | Value                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_...` (later `sk_live_...`), or a restricted key with write access to Customers, Checkout Sessions, Billing Portal sessions, Subscriptions (to cancel a duplicate), Invoices (to void one) and Refunds |
| `STRIPE_PRICE_ID`       | The `price_...` id from step 1                                                                                                                                                                                 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 4 or 5                                                                                                                                                                                   |
| `APP_URL`               | Public origin, for example `https://staging.sagelytics.example`. Falls back to `NEXTAUTH_URL`                                                                                                                  |

On Fly: `fly secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_ID=... STRIPE_WEBHOOK_SECRET=... APP_URL=... -a <web-app>`. Never commit these.

### 3. Apply the schema

Billing adds `sg_billing_subscription`, `sg_usage_event` and `sg_stripe_event` (`drizzle/0002_billing.sql`), the checkout-session columns on `sg_billing_subscription` (`checkout_session_id`, `checkout_session_expires_at`, `checkout_attempt`), the paid-period columns (`paid_period_start`, `paid_period_end`) and the `sg_billing_duplicate_refund` ledger. The paid-period migration backfills `active` and `trialing` rows from `current_period_*`, so current subscribers keep pro. `past_due` and `canceled` rows are left empty, because their current period may be an unpaid renewal. They resolve to free (a NULL paid period never grants pro) until the next subscription or invoice event re-reads Stripe. Once Stripe keys exist, run the resync once to restore any that did pay (see [Resync paid periods](#resync-paid-periods)). Back up existing databases, then run `pnpm db:migrate` (the Docker `migrate` service does this). `pnpm db:push` is for local development only. See [deploy.md](deploy.md#apply-the-database-schema).

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
  - `invoice.paid`
  - `invoice.payment_failed`
  - `refund.updated`
  - `refund.failed`
  - `charge.refund.updated`
  - `charge.refunded`

The last four follow duplicate-subscription refunds until Stripe settles them (see [Duplicate subscriptions](#duplicate-subscriptions)). Local `stripe listen` forwards every event, so it needs no change.

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

| Endpoint                     | Auth             | Result                                                                                                                                                                                              |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/billing/checkout` | session          | `{ url }`; 409 `{ error, portalUrl }` if already subscribed; 409 `{ error: 'checkout already in progress' }` while another checkout (or webhook) for the user holds the lock; 503 if not configured |
| `POST /api/billing/portal`   | session          | `{ url }`; 409 if the user has no Stripe customer; 503 if not configured                                                                                                                            |
| `POST /api/stripe/webhook`   | Stripe signature | `{ received, outcome: 'processed' \| 'duplicate' }`; 400 on a bad signature; 500 makes Stripe retry (handling failed, or a duplicate refund the event found is still owed)                          |
| tRPC `billing.getStatus`     | session          | `billingEnabled`, `plan`, `status`, `limits`, `periodStart`, `periodEnd`, `cancelAtPeriodEnd`, `usage.discoveries`, `usage.monitoredProducts`                                                       |

## Checkout behavior

Two open Checkout Sessions could both be paid, leaving a customer with two subscriptions. `createCheckoutSession` prevents that, all under the user's billing lock:

1. A user with a live subscription gets 409 and a `portalUrl`. Live means pro by the rules above, or a status Stripe can still bill: `active`, `trialing`, `past_due`, `unpaid` or `paused`. Stripe's subscription list for the customer is checked too, in case a webhook was missed.
2. The open session is stored on `sg_billing_subscription` (`checkout_session_id`, `checkout_session_expires_at`). While Stripe reports it `open` with more than 2 minutes left, the same URL is returned. If it is about to expire, it is expired first. A `complete` session (paid, webhook not landed yet) gets 409.
3. Otherwise a new session is created with `expires_at` at Stripe's 30-minute minimum (plus one minute of clock margin). The idempotency key is `sagelytics-checkout-<userId>-<attempt>`; `checkout_attempt` counts up per new session.

Checkout takes the lock with `pg_try_advisory_xact_lock`, not `pg_advisory_xact_lock`. If another checkout or a webhook for the same user holds it, the request answers 409 `checkout already in progress` at once instead of holding a pool connection in the queue. Every Stripe call made under the lock has an 8-second timeout and at most one retry, so a slow Stripe cannot hold the lock (and the connection) for long. Webhooks wait for the lock for up to 5 seconds (see [Bounded waits](#bounded-waits)); usage reservations wait as long as it takes.

### Duplicate subscriptions

Backstop: when `checkout.session.completed` arrives for a customer who already has an older `active`, `trialing` or `past_due` subscription, the new one is a duplicate. The oldest subscription is always kept, whatever order the events arrive in.

1. In the event transaction, before anything in Stripe changes, the duplicate is written to `sg_billing_duplicate_refund` with `status = 'pending'`, the kept subscription and the event id. It commits together with the event id.
2. After commit, outside any transaction, the duplicate is canceled without proration (idempotency key `sagelytics-duplicate-cancel-<sub>`, skipped if Stripe already shows it canceled). Its first invoice is then voided if still unpaid (`voided`), or refunded in full.
3. `pending` means the refund is still owed, even after Stripe accepts it. The refund's id goes in `refund_id` and the row stays `pending` until Stripe reports that refund `succeeded`; only then does it become `refunded`. The row also closes as `refunded` if the payment is already fully refunded by any means (a dashboard refund, or Stripe answering `charge_already_refunded`), and as `nothing_to_refund` if nothing was collected.
4. Each later settlement retrieves the refund by `refund_id`. `pending` or `requires_action` keeps waiting (`requires_action` also raises an alert). `failed` or `canceled` moved no money, so a new refund replaces it. The new refund uses a new idempotency key, `sagelytics-duplicate-refund-<sub>-after-<failed refund id>`, because the old key would only replay the failed refund. Concurrent settlers replacing the same failure share that key, so only one refund is made. Each failure adds one to `attempts` and sets `last_error`.
5. If a Stripe call errors, the row stays `pending` with `attempts` and `last_error`, and the webhook answers 500. Stripe redelivers the event: the event itself is a `duplicate` by then, but the settlement runs again with the same idempotency keys, so the customer is refunded exactly once. The event is answered 200 once the refund it found has been accepted by Stripe; following it to `succeeded` is left to the refund events.
6. Refund events settle the row they belong to. `refund.updated`, `refund.failed` and `charge.refund.updated` find it by the `metadata.subscription` our refunds carry, and answer 500 while a failed refund cannot be replaced. `charge.refunded` settles every pending row for the charge's customer, which is how a dashboard refund closes the obligation. Any other webhook for the customer also settles that customer's pending rows, so a refund owed after Stripe stops retrying (about 3 days) still goes through. Rows stuck in `pending` need a person; the server logs `[BILLING] ALERT: duplicate ...`.

Why both: answering 500 makes Stripe retry quickly with its own backoff, and nothing is acknowledged while money is owed. The durable row is what makes the retry safe. It survives the event, it skips a cancel that already happened, and it is never stored as the user's subscription. It also gives an operator a list of what is still owed. A recorded duplicate's own `customer.subscription.*` events are always ignored.

## Webhook behavior

- The signature is checked against the raw body. There is no middleware, so nothing in front of the route needs an exception.
- Each event id is inserted into `sg_stripe_event` in the same transaction as its writes. A redelivery is answered `duplicate`; a failure rolls back both so Stripe's retry reprocesses.
- Subscription state is re-read from Stripe (`subscriptions.retrieve`, plus `invoices.list` for the paid period), not taken from the payload. The one exception is a paid `invoice.paid` payload: its line period counts as paid even if the list read lags, because the payload is signed. The re-read and the write happen inside the event transaction, which first takes the owning user's billing lock. Events for one user apply one at a time, and each reads Stripe after the previous one committed. A slow read of an old state can never be written after a newer one.
- The lock user is the one linked to the event's customer. If the customer is not linked yet, it is the `client_reference_id` or `metadata.userId` that our server wrote at checkout.
- The user comes from our own customer link (`sg_billing_subscription.stripe_customer_id`) or from `client_reference_id`/`subscription.metadata.userId`, which only our server sets at checkout. A payload can never move a linked customer to another user.

### Bounded waits

Billing code holds a pool connection across Stripe calls, and webhook events hold the user's billing lock while they re-read Stripe. To keep a slow Stripe from stalling the pool:

- The Stripe client cuts every request off after 10 seconds and retries it at most once (`src/server/billing/stripe-options.ts`). Before this it used the SDK default of 80 seconds and 2 retries. Checkout keeps its 8-second per-request override.
- A webhook waits at most 5 seconds for the user's lock (`SET LOCAL lock_timeout` around `pg_advisory_xact_lock`, then reset for the rest of the transaction). If it times out, nothing was recorded and the route answers 500, so Stripe redelivers the event later.
- Duplicate cancels and refunds run after the event commits, outside any transaction and without the lock. They touch only Stripe objects that Stripe's idempotency keys protect and ledger rows that move by compare-and-set, so they need neither.

The trade-off: the lock wait is bounded rather than removed. Events for one user still apply one at a time, and each re-reads Stripe only after the previous one committed, so a stale read can never overwrite a newer one. The cost is a 500 and a later redelivery when a user's lock stays busy for more than 5 seconds. The worst case is 2 attempts of 10 seconds each for one Stripe call. Taking Stripe re-reads out of the transaction instead would have needed a version check on every write to keep that ordering, and would not have shortened anything Stripe itself makes slow.

### Resync paid periods

Migration 0009 leaves `paid_period_*` empty on `past_due`, `canceled` and `unpaid` rows, which therefore resolve to free. Once the Stripe keys exist, run the resync once. It reads each such subscription's latest paid invoice from Stripe, using the same lookup as the webhook, and writes that invoice's service period. Rows with no paid invoice stay empty. It is a dry run unless you pass `--apply`, only reads from Stripe, and skips a row that a webhook filled in the meantime:

```sh
node --env-file=.env scripts/maintenance/resync-paid-periods.mjs          # dry run: prints what it would write
node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --apply
```

It needs Node 22.18 or later (it imports TypeScript from `src/`), `DATABASE_URL` and `STRIPE_SECRET_KEY`. It exits 1 if any row errored.

## Tests

`pnpm test` mocks Stripe at the module boundary and never calls the network. The real-Postgres tests in `src/server/billing/store.pg.test.ts` are skipped unless `BILLING_TEST_DATABASE_URL` points at a migrated, disposable database. They cover advisory-lock concurrency, webhook idempotency, events serialized under the lock, the stored checkout session, the usage timestamp, monitored-product reservations, a failed duplicate refund retried once, a pending refund followed to success and a failed one replaced under a new key, the usage window across failed and paid renewals, a fast busy answer for concurrent checkouts, the bounded webhook lock wait, and the paid-period resync. Create the schema with `pnpm db:migrate` (or `pnpm db:push --force`) against that database first.

```sh
BILLING_TEST_DATABASE_URL=postgresql://.../sagelytics_billing pnpm vitest run src/server/billing/store.pg.test.ts
```
