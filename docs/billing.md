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

1. In the event transaction, before anything in Stripe changes, the duplicate is written to `sg_billing_duplicate_refund` with `status = 'pending'`, the kept subscription, the event id and its checkout invoice (`invoice_id`). That is the checkout session's own `invoice`, else the subscription's invoice with `billing_reason = 'subscription_create'` (all pages of `invoices.list`). It is never the subscription's `latest_invoice`: an event processed late, after the duplicate renewed, would find the renewal there. If neither is found the row is recorded with `invoice_id` null and goes to a person (see [Duplicates that renewed](#duplicates-that-renewed)). It commits together with the event id.
2. After commit, outside any transaction, the duplicate is canceled without proration (idempotency key `sagelytics-duplicate-cancel-<sub>`, skipped if Stripe already shows it canceled). Its checkout invoice is then voided if still unpaid (`voided`), or refunded in full. See [Duplicates that renewed](#duplicates-that-renewed) for any other invoices it has.
3. `pending` means the refund is still owed, even after Stripe accepts it. The refund's id goes in `refund_id` and the row stays `pending` until Stripe reports that refund `succeeded`; only then does it become `refunded`. The row also closes as `refunded` if the payment is already fully refunded by any means (a dashboard refund, or Stripe answering `charge_already_refunded`), and as `nothing_to_refund` if nothing was collected.
4. Each later settlement retrieves the refund by `refund_id`. `pending` or `requires_action` keeps waiting (`requires_action` also raises an alert). `failed` or `canceled` moved no money, so a new refund replaces it, within the limits in [Refunds that keep failing](#refunds-that-keep-failing).
5. `attempts` is the number of refunds made for the duplicate, counting the first. Each refund is a numbered attempt. The row's `attempts` is raised to that number by compare-and-set before Stripe is called, so a refund Stripe makes is counted even if its response is lost. The number also goes in the refund's `metadata.attempt` (next to `metadata.subscription`) and in its idempotency key: `sagelytics-duplicate-refund-<sub>` for attempt 1, `sagelytics-duplicate-refund-<sub>-attempt-<n>` after that. A retry of the same attempt reuses its key, so within Stripe's 24-hour key window it gets the same refund back. Of concurrent settlers, only the one whose compare-and-set wins makes the next attempt.
6. If a Stripe call errors, the row stays `pending` with the error in `last_error`, and the webhook answers 500. The error adds nothing to `attempts`: the next settlement retries the attempt already counted, under the same key. Stripe redelivers the event: the event itself is a `duplicate` by then, but the settlement runs again with the same idempotency keys, so the customer is refunded exactly once. The event is answered 200 once the refund it found has been accepted by Stripe; following it to `succeeded` is left to the refund events.
7. Refund events settle the row they belong to. `refund.updated`, `refund.failed` and `charge.refund.updated` find it by the `metadata.subscription` our refunds carry, and answer 500 while a failed refund cannot be replaced. `charge.refunded` settles every open row (`pending` or `needs_attention`) for the charge's customer, which is how a dashboard refund closes the obligation. Any other webhook for the customer also settles that customer's open rows. Rows stuck in `pending` need a person; the server logs `[BILLING] ALERT: duplicate ...`.
8. Several events can settle one row at once (the checkout event that found it, the `customer.subscription.deleted` our cancel causes, refund events). Only one wins each attempt. The event that answers for the row (the one that recorded it, or a refund event for it) is acknowledged only if the refund is confirmed: the row is closed or `needs_attention`, or its recorded `refund_id` is one Stripe shows `pending`, `requires_action` or `succeeded`. An event that lost the race re-reads the row and retrieves that refund to check. Losing the race proves nothing. The winner may have hit an API error, crashed, or not stored its refund yet, so with no `refund_id`, or a failed one, the event answers 500 and Stripe redelivers it. The redelivery settles the row itself and reuses the reserved attempt's key, so it never makes a second refund for the attempt. Events that don't answer for the row (`charge.refunded`, or another event for the customer) are acknowledged either way.

#### Duplicates that renewed

A row can wait long enough for the duplicate to renew, for example one Stripe stopped retrying that the sweep reaches a month later. By then the subscription's `latest_invoice` is the renewal, not the checkout invoice. So settlement never reads `latest_invoice`:

- The checkout invoice is `invoice_id` on the row.
- Some rows are not settled automatically:

  - a row with no `invoice_id`, recorded before the column existed or with no invoice found;
  - a row whose `refund_id` is a refund on some other payment;
  - a row whose `attempts` is more than one ahead of the refunds Stripe shows on the checkout payment.

  Only older code wrote such rows, and it may have refunded the renewal instead, so closing the row or refunding again could be wrong. The row moves straight to `needs_attention` with `last_error = 'missing checkout invoice'` and nothing changes in Stripe. The manual-resolution log line has `"reason"` set to `missing_checkout_invoice`, `stored_invoice_not_checkout` (the stored invoice is not the `subscription_create` one, because older code stored a renewal), `refund_not_on_checkout_payment` or `attempts_not_on_checkout_payment`. These checks run before any cancel, void or refund. Billing has never run in prod, so these should only appear in test data. To resolve one, find the checkout invoice and what was refunded in the dashboard, then follow the steps below.

- Every other invoice of the duplicate that is still `open` (a renewal) is voided as part of canceling it. Voiding a renewal never closes the row. The row closes as `voided` only when the checkout invoice itself was open and is now void. Otherwise the checkout payment is refunded as above.
- A renewal the customer paid is money they shouldn't have paid either. Settlement makes no refund for it. Once the checkout invoice is settled (refunded, voided or nothing to refund), a row with a paid renewal not yet fully refunded moves to `needs_attention` instead of closing. `last_error` names the renewal (`renewal paid: in_...`), and the manual-resolution log line has `"reason":"renewal_paid"` and the invoice ids. Refund the renewal from the dashboard. `charge.refunded` then closes the row once both the checkout payment and the renewals show fully refunded. If the checkout invoice was voided rather than paid, there is no checkout payment to see refunded, so close the row by hand (step 4 below) after refunding the renewal. This is rare (the duplicate is canceled at the first settlement, so it only renews when settlement is stuck for a full period). Refunding renewals automatically would need a separate attempt count and idempotency key per payment, so it is left to a person.
- The invoice list is read page by page (`starting_after` while `has_more`), so a renewal past the first 100 invoices is still seen.
- `needs_attention` rows are only read. The re-check (webhooks and the sweep) never voids, cancels or refunds, and writes nothing to a row with no `invoice_id`. It closes the row as `refunded` only when Stripe shows the checkout payment, and any paid renewal, fully refunded.

#### When Stripe stops retrying

Stripe retries a failed live-mode delivery for about 3 days ([automatic retries](https://docs.stripe.com/webhooks#automatic-retries)). The retry rule above cannot loop forever. Each redelivery runs a full settlement, which either gets a refund accepted (the event is then acknowledged), closes or flags the row, or meets another Stripe error. If Stripe still errors after 3 days, Stripe gives up on the event and the row stays `pending`, with its reserved attempt in `attempts` and the error in `last_error`. Nothing is lost. Two things settle it later:

- The customer's next `checkout.session.completed`, `customer.subscription.*` or `invoice.*` event, or a refund event for the row. A monthly renewal sends `invoice.paid` for the kept subscription, so an active customer is picked up within a billing period.
- The maintenance sweep, for a customer who sends nothing more (for example one who canceled):

  ```sh
  node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --duplicates          # lists open rows
  node --env-file=.env scripts/maintenance/resync-paid-periods.mjs --duplicates --apply  # settles them
  ```

  `--apply` runs the webhook's own settlement on every open row (`settleOpenDuplicateRefunds`), so it may cancel the duplicate, void its open invoices or refund its checkout invoice. It is safe alongside live webhooks: the same compare-and-set and idempotency keys apply. `needs_attention` rows are only re-checked, never refunded. It exits 1 if a row is still owed after a Stripe error. Run it when the `[BILLING] ALERT: duplicate subscription refund failed` alert fires and no later event cleared it, or on a daily schedule.

#### Refunds that keep failing

Refunds only go back to the original payment method, so a refund the customer's bank keeps rejecting would otherwise be replaced forever. Stripe's guidance for a failed refund is to pay the customer back another way ([Handle failed refunds](https://docs.stripe.com/refunds#failed-refunds)). So:

- At most `MAX_DUPLICATE_REFUND_ATTEMPTS` (3) refunds are made per duplicate, counting the first. When the third fails, no fourth is made.
- These failure reasons go to a person on the first failure, without a replacement: `lost_or_stolen_card`, `expired_or_canceled_card`, `insufficient_funds` (Stripe held it 45 days without balance), `merchant_request` and `charge_for_pending_refund_disputed` (the dispute decides it). A `canceled` refund is never redone either: someone stopped it on purpose. `declined` and `unknown` may be transient, so they are retried up to the cap.
- Stripe, not the row, is the record of what was tried. Before any new refund, the settlement lists the payment's refunds and takes every one whose `metadata.subscription` is the duplicate, in any status, including refunds whose response never reached us (a timeout or crash after Stripe accepted it). If one succeeded, the row closes as `refunded`. If one is `pending` or `requires_action`, it is adopted and no refund is made. If one failed for a reason above or was canceled, the row goes to `needs_attention`. Otherwise the refunds made are the larger of `attempts` and what Stripe shows (the count of our refunds, or the highest `metadata.attempt`), and that is what the cap checks. This holds after Stripe prunes an idempotency key (it may after 24 hours), when a retry with the old key would make a new refund.
- Either way the row moves to `status = 'needs_attention'`, with `refund_id` set to the refund that failed, `attempts` set to the refunds made, and the failure in `last_error` (for example `refund re_123 failed: lost_or_stolen_card`). The move is compare-and-set on the row's refund and attempt count, so concurrent settlers move it once.
- The server logs one line for it, with ids and the reason only (no email or card data):

  ```
  [Billing] duplicate refund needs manual resolution {"subscription":"sub_...","refund":"re_...","attempts":3,"reason":"declined"}
  ```

  Alert on that prefix. The webhook answers 200: redelivery cannot fix it.

- Webhooks never refund a `needs_attention` row again, and neither does the duplicate sweep (`--duplicates --apply`). The paid-period resync never refunds anything.
- The row is still owed. `charge.refunded` and every other webhook for the customer re-check it, and it closes as `refunded` once Stripe shows the duplicate's payment fully refunded by any means.

To resolve a `needs_attention` row:

1. Find open rows: `select stripe_subscription_id, stripe_customer_id, refund_id, attempts, last_error, updated_at from sg_billing_duplicate_refund where status = 'needs_attention';`
2. In the Stripe dashboard, open the payment on the duplicate's checkout invoice (`invoice_id`) and read the failed refunds on it. If `last_error` starts with `renewal paid:`, the checkout invoice is settled and the named renewal is what still needs a refund.
3. If the card can take a refund again (for example the issuer has fixed a decline), refund the remaining amount from the dashboard. Stripe sends `charge.refunded` once it succeeds, and the row closes as `refunded` by itself.
4. If not, pay the customer back outside Stripe (bank transfer, or a credit agreed with them), then close the row by hand and note how: `update sg_billing_duplicate_refund set status = 'refunded', last_error = 'paid back by <method> on <date>', resolved_at = now(), updated_at = now() where stripe_subscription_id = '<sub>' and status = 'needs_attention';`

`status` is plain `varchar(32)` with no check constraint, so `needs_attention` needed no migration. Counting attempts before the call reuses the existing `attempts` column, so that needed none either. `invoice_id` is a nullable column added by a migration: `ALTER TABLE "sg_billing_duplicate_refund" ADD COLUMN IF NOT EXISTS "invoice_id" varchar(255);`. Existing rows keep it null and go to `needs_attention` at their next settlement.

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

It needs Node 22.18 or later (it imports TypeScript from `src/`), `DATABASE_URL` and `STRIPE_SECRET_KEY`. It exits 1 if any row errored. `--duplicates` also settles open duplicate refunds (see [When Stripe stops retrying](#when-stripe-stops-retrying)).

## Tests

`pnpm test` mocks Stripe at the module boundary and never calls the network. The real-Postgres tests in `src/server/billing/store.pg.test.ts` are skipped unless `BILLING_TEST_DATABASE_URL` points at a migrated, disposable database. They cover advisory-lock concurrency, webhook idempotency, events serialized under the lock, the stored checkout session, the usage timestamp, monitored-product reservations, a failed duplicate refund retried once, a pending refund followed to success and a failed one replaced under a new key, three failed refunds ending in `needs_attention` with no fourth, a permanent failure going there at once and closing on `charge.refunded`, racing failure events making one replacement and one move, refunds whose response was lost (an unseen permanent failure going to `needs_attention` after its key is pruned, unseen failures counting toward the cap, a recorded attempt retried under its own key after a crash, and racing settlers making one refund per attempt), the owning checkout event staying retryable when a racing `customer.subscription.deleted` wins its attempt and gets an API error (and being acknowledged when the winner's refund is in flight), the duplicate sweep settling a row no event will retry, a duplicate that renewed before the sweep reached it (checkout payment refunded, open renewal voided, row never `voided`), a legacy row without `invoice_id` going to `needs_attention` untouched (and neither closing on a refund of its renewal nor refunding past the cap), a checkout event processed after a renewal storing the session's invoice, the `needs_attention` re-check changing nothing in Stripe, an open checkout invoice still voided and closed as `voided`, the usage window across failed and paid renewals, a fast busy answer for concurrent checkouts, the bounded webhook lock wait, and the paid-period resync. Create the schema with `pnpm db:migrate` (or `pnpm db:push --force`) against that database first.

```sh
BILLING_TEST_DATABASE_URL=postgresql://.../sagelytics_billing pnpm vitest run src/server/billing/store.pg.test.ts
```
