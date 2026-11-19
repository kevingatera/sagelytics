# Billing wiring

Where to call the billing gates once the discovery routes are free to edit. Line numbers are against `feat/two-stage-discovery-finish` at 4ee48d4; re-check them before applying. Setup and allowance rules are in [../billing.md](../billing.md).

## Rules for every discovery call site

- Reserve with `recordDiscoveryUsage(userId, ref)` **before** calling the microservice. It is the race-safe gate: it re-counts under a per-user advisory lock and throws `BillingLimitError` at the limit.
- If the microservice call throws, refund with `releaseDiscoveryUsage(userId, usageId)`. A run that returned results stays charged, even with zero competitors.
- `assertCanRunDiscovery(userId)` is optional: an unlocked pre-check for answering 402 before doing other work (saving onboarding rows, claiming jobs). It never replaces the reservation.
- HTTP routes: map `BillingLimitError` to `402` with `error.toJSON()` (has `limit`, `used`, `remaining`, `resetsAt`, `plan`).
- tRPC: this tRPC version has no `PAYMENT_REQUIRED` code. Throw `new TRPCError({ code: 'FORBIDDEN', message: error.message, cause: error })` and let the UI read `limit`/`resetsAt` from `billing.getStatus`.

All helpers import from `~/server/billing`.

## Discovery call sites

### 1. `src/app/api/onboarding/route.ts:103` and `:208` (onboarding, background run)

The route answers before discovery runs, so reserve synchronously, before the job claim at line 103, and refund in the background `catch` at line 367.

```ts
// before line 103: const job = await progressService.claimOnboardingJob(...)
let reservation: { usageId: string };
try {
  reservation = await recordDiscoveryUsage(session.user.id, sessionId);
} catch (error) {
  if (isBillingLimitError(error)) return Response.json(error.toJSON(), { status: 402 });
  throw error;
}
```

On the reuse path (`if (!job.claimed)`, line 104) call `await releaseDiscoveryUsage(session.user.id, reservation.usageId)` before returning, since no new run starts. In the background `catch` at line 367, add `await releaseDiscoveryUsage(session.user.id, reservation.usageId).catch(() => undefined);`. Also release in the outer `catch` at line 386 when `claimedJob` was never set. Add the 402 case to `src/app/api/onboarding/route.test.ts` and mock `~/server/billing` there.

### 2. `src/app/api/competitor-discovery/route.ts:23-30`

```ts
// before line 23
let usageId: string;
try {
  ({ usageId } = await recordDiscoveryUsage(session.user.id, body.domain));
} catch (error) {
  if (isBillingLimitError(error)) return Response.json(error.toJSON(), { status: 402 });
  throw error;
}
// wrap lines 24-30: on throw, await releaseDiscoveryUsage(session.user.id, usageId) and rethrow
```

### 3. `src/app/api/competitor-initial/route.ts:57-63`

Same as site 2, before line 57, with `ref = sessionId ?? onboardingData.companyDomain`. On a 402 also call `progressService.setError(sessionId, error.message)` when `sessionId` is set, matching the route's other early exits.

### 4. `src/server/api/routers/competitor.ts:342-349` (`rediscover` mutation)

```ts
// before line 342
const { usageId } = await recordDiscoveryUsage(ctx.session.user.id, 'rediscover').catch((error: unknown) => {
  if (isBillingLimitError(error)) throw new TRPCError({ code: 'FORBIDDEN', message: error.message, cause: error });
  throw error;
});
// wrap lines 343-349: on throw, await releaseDiscoveryUsage(ctx.session.user.id, usageId) and rethrow
```

`src/server/api/routers/competitor.test.ts` mocks the router's dependencies; add `vi.mock('~/server/billing', ...)` there.

### Not metered (decide before launch)

- `src/server/api/routers/competitor.ts:235` `competitor.add` calls `analyzeCompetitor` (one known domain, an LLM call but no SERP discovery). Suggest metering it as `discovery` too if cost matters; otherwise leave it free.
- `src/server/api/routers/competitor.ts:205` and `src/app/api/product-monitor/route.ts:70` call `discoverWebsiteContent` (catalog crawl, Spider). Not an LLM+SERP discovery; leave unmetered.

## Monitored-product limits

The limit is on the total number of product URLs across a user's monitoring tasks (`countMonitoredProducts` sums `jsonb_array_length(product_urls)`).

### 5. `src/app/api/monitoring-tasks/route.ts:82` (POST, user creates a task)

```ts
// before line 82
try {
  await assertCanMonitorProducts(session.user.id, productUrls.length);
} catch (error) {
  if (isBillingLimitError(error)) return NextResponse.json(error.toJSON(), { status: 402 });
  throw error;
}
```

`createMonitoringTask` merges into an existing task for the same domain, so `productUrls.length` over-counts re-added URLs. That only errs toward refusing early; exact counting needs the merge to happen first (see site 7).

### 6. `src/app/api/monitoring-tasks/route.ts:120` (PUT, `productUrls` replaced)

When `updates.productUrls` is set, check the delta: load the task, then `assertCanMonitorProducts(userId, updates.productUrls.length - task.productUrls.length)` when the delta is positive.

### 7. `src/app/api/onboarding/route.ts:301` (tasks created from discovery results)

Don't fail onboarding here. Truncate instead:

```ts
const { remaining } = await getMonitoredProductUsage(session.user.id);
const urls = competitor.monitoringData.productUrls.slice(0, remaining);
if (urls.length > 0) await createMonitoringTask({ ...existingArgs, productUrls: urls });
```

`remaining` must be re-read per competitor inside the loop at line 275.

### Better long-term spot

`src/server/db/queries/monitoring.ts:15` `createMonitoringTask` is the one writer for both routes. Enforcing there (count after merge, inside a `withUserLock` transaction) would make the cap exact and race-safe. It is not done now because it changes a shared query used by the routes another agent is editing.

## UI

`billing.getStatus` has everything the settings billing tab needs. Checkout and portal are `POST` and return `{ url }`; the client should `window.location.assign(url)`. On `checkout=success`, refetch `getStatus`, since the webhook can land a few seconds after the redirect.
