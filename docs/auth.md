# Authentication

Next-auth v5 with JWT sessions (`src/server/auth/config.ts`), with Google and email/password sign-in.

## Email verification

- Registration (`POST /api/auth/register`) creates the account with `email_verified = null` and emails a link to `/verify-email?token=…`. New and existing emails get the same 200 response. An existing address, verified or not, is left unchanged and gets a "you already have an account" email with a reset link instead of a verification link.
- Password sign-in is refused until `email_verified` is set. The login form says the email is unconfirmed only after the correct password; anything else gets the generic "Invalid email or password".
- `/verify-email` asks for the account password. `POST /api/auth/verify-email` takes `{ token, password }`, looks the token up by hash, checks the password with bcrypt, then in one transaction consumes the token and sets `email_verified` only if the password hash is still the one it checked. A wrong password leaves the link usable. Without a token, the page shows a resend form (`POST /api/auth/resend-verification`, which answers the same way for every email).
- Google accounts are created verified. Google sign-in is refused unless Google reports `email_verified`, and, for an already linked Google account, unless Google's email matches the stored one (see below).
- A successful password reset also marks the email verified, since the reset link proves the user owns the mailbox, and deletes any outstanding verification link.
- A password reset or email confirmation also deletes the account's unproven Google links for addresses Google doesn't control, in the same transaction (see "When Google speaks for an address").

### Why confirmation needs the password

Clicking a link only proves the mailbox. Without the password check, an attacker could register the victim's address with the attacker's password; when the victim clicked "Confirm email", the attacker's password would start working. Now:

- Confirming proves both the mailbox (the link) and the password. A victim who never chose that password cannot confirm it, and the page points them to "Reset it" instead.
- A reset replaces the password, verifies the address and drops the verification link, so the attacker's password is gone for good.
- Registering an address that already exists changes nothing, so neither the attacker (registering first) nor the owner (registering second) can overwrite the other's password. The owner gets the "already have an account" email and resets from there.
- If the password changes between the check and the write (a reset in flight), the confirmation rolls back with `409` and the link stays usable for the new password.
- Attempts are limited to 20/hour per IP and 10/hour per account, plus the shared bcrypt ceiling.

### Accounts from before verification

Before migration 0007, `email_verified` defaulted to the creation time, so every account looked verified, and the old settings page let anyone change their email without proof. Neither the stamp nor an OAuth link (made under whatever address Google had, not necessarily the stored one) proves the stored address. So 0007 clears `email_verified` for every existing account and bumps every `session_version`, which signs out every session from before the migration.

- Password users see the "not confirmed" prompt after the correct password and confirm through a resent link, or reset their password.
- Google users sign in with Google as before, as long as Google's verified email matches the stored one (ignoring case) and Google controls the address (see "When Google speaks for an address"). An old link may point at an account whose address Google never vouched for, so a linked Google account whose email differs, or that Google has not verified, is refused: nothing is linked or changed, no session is issued, and `/auth/error` (`GoogleEmailMismatch` or `GoogleEmailUnverified`) tells the user to sign in with their password or reset it.
- A matching Google sign-in for an address Google controls, on an unverified account, marks it verified and, in the same statement, clears its password and bumps `session_version`. Nobody proved that whoever set that password owned the mailbox (someone else may have registered the address before verification existed and later had it linked), so the password stops working and every other session ends. The new Google session gets the bumped version, and the owner can set a password through "Forgot password". Already verified accounts keep their password. This runs in the `jwt` callback at sign-in (`recordGoogleSignIn` in `src/server/auth/oauth-link.ts`), after the `signIn` callback has checked the email and before the session cookie is written.

### When Google speaks for an address

Google's `email_verified` only says the address was verified at some point. For an address Google doesn't control, that may have been a previous holder of a reassigned mailbox, whose Google account still reports `email_verified: true` ([Google's guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)). Google controls an address when it ends in `@gmail.com` or `@googlemail.com`, or when the token's `hd` (Workspace domain) equals the address's domain, ignoring case. `googleControlsEmail` in `src/server/auth/google-authority.ts` is the one place that decides this.

Each Google link (`sg_account.proven_at`) records when it was made or used while the mailbox was proven. Links from before this column start unproven.

- For an address Google controls, sign-in works as described above. It also sets `proven_at` on the link.
- For any other address, a Google sign-in never verifies an account, clears a password or bumps `session_version`. Through an existing link, it is allowed only when the account is verified and the link is proven. Otherwise it is refused with `/auth/error?error=GoogleLinkUnproven`, which tells the user to confirm their email or reset their password, then sign in with their password.
- A new link is proven when Google controls the address or the account is already verified when the link is made.
- A password reset or email confirmation deletes the account's Google links that are unproven and whose address Google doesn't control, in the transaction that sets the new password or verification. A former holder's link stops working at once. Links stay when the address is Gmail, or when the `id_token` stored with the link has an `hd` for the address's domain. A dropped link can't be used signed out (Auth.js answers `OAuthAccountNotLinked`). A Google link made while signed in to the now verified account is proven, but the app has no "connect Google" button yet, so until then these users sign in with their password.
- New Google accounts (no existing row) are created as before.

## Tokens

Verification and reset tokens share `sg_verification_token`. Each `identifier` is `verify:<email>` or `reset:<email>`. Tokens are 32 random bytes (base64url). Only their SHA-256 is stored, so lookups compare hashes and never the raw value. Each token is consumed once with `DELETE … RETURNING`, filtered on purpose and expiry. A reset consumes the token, sets the password and bumps `session_version` in one transaction. Verification links last 24 hours and reset links last 1 hour. Issuing a new token replaces the previous one of the same purpose.

## Session invalidation

`sg_user.session_version` is copied into the JWT at sign-in. A custom `jwt.decode` (`src/server/auth/session-jwt.ts`) re-reads it (a primary-key lookup) whenever Auth.js reads the session cookie, so every protected page, tRPC call and API route sees the current value, and a reset or password change ends other sessions on their next request. The `jwt` callback reuses the decoder's result, so each request still makes one lookup.

The check lives in the decoder because Auth.js's OAuth callback decodes the cookie itself and links the new provider account to its `sub` without running the `jwt` callback. A revoked session, or one this request could not confirm, decodes without `sub`, so the OAuth callback treats the visitor as signed out and links nothing to the account.

## Linking Google to an account

Auth.js links a Google account to the signed-in user when that Google account is new. The adapter's `linkAccount` (`src/server/auth/oauth-link.ts`) refuses unless Google's `id_token` reports `email_verified` for the same address as the account's stored email, ignoring case. It sets `proven_at` when Google controls the address or the account is already verified. A refused link fails the sign-in with nothing written. Signed out, Auth.js never links a Google account to an existing email (`OAuthAccountNotLinked`).

If that lookup fails, the session is kept for the request but marked `sessionVerified: false`. Reads go ahead, so a database blip does not sign everyone out. tRPC mutations on `protectedProcedure` refuse such a session with `SERVICE_UNAVAILABLE`, and API routes that change data should use `requireWriteSession()` from `~/server/auth`, which returns a 401 response when signed out and a 503 for such a session.

## Changing the password in settings

`user.updatePassword` (`src/server/auth/password.ts`) checks the current password, then writes with a compare-and-swap on the password hash and `session_version` it read, and requires the caller's session to carry that same version. If a reset or another change commits in between, nothing is written, the call fails with `CONFLICT`, and the settings page signs the user out. A successful change bumps `session_version`. Attempts are limited to 5 per 15 minutes per user, plus the shared bcrypt ceiling.

## Rate limits

`src/server/rate-limit.ts` keeps fixed-window counters in Redis (`REDIS_URL`, or `REDIS_HOST`), with an in-process fallback when Redis is unset or failing. The fallback is logged once.

| Endpoint | Limits | Over the limit |
| --- | --- | --- |
| Register | 5/hour per IP, 3/hour per email; bcrypt ceiling 300/min | 429 with `Retry-After` |
| Forgot password, resend verification | 5/hour per IP; 1/minute and 5/day per email | Same 200, nothing sent |
| Credentials sign-in | 10 per 15 min per IP+email, 50 per 15 min per IP; bcrypt ceiling 1200/min | "Too many attempts" |
| Settings password change | 5 per 15 min per user; bcrypt ceiling 300/min | `TOO_MANY_REQUESTS` |
| Verify email | 20/hour per IP; 10/hour per account; bcrypt ceiling 600/min | 429 with `Retry-After` |
| Reset password | 10/hour per IP before the token lookup; 10/hour per account; bcrypt ceiling 300/min | 429 with `Retry-After` |

Every bcrypt route has a per-account rule (per email, per user, or per reset-link account) that applies whatever the IP. With an unknown IP, the per-IP+email sign-in rule is effectively per email. So a flood without a usable IP can lock out only the accounts it targets, not everyone.

The bcrypt ceiling is a CPU backstop per endpoint, with separate buckets of the same size for unknown-IP and known-IP requests, so a flood without a usable IP cannot crowd out identified clients. A client's own limits are checked first; a request they refuse spends nothing from the ceiling. Reset looks up the token by its hash before hashing the new password, so a made-up token costs one indexed query and no bcrypt.

Emails are trimmed and lowercased before every comparison.

### Client IP

The client IP comes only from a source the deployment configures:

- `CLIENT_IP_HEADER`: a header the edge always overwrites, for example `cf-connecting-ip` behind Cloudflare (staging runs behind a Cloudflare tunnel) or `fly-client-ip` on Fly (set in `deploy/fly/web.toml`). Only this header is read.
- `TRUSTED_PROXY_HOPS`: the number of proxies in front of the app that append to `X-Forwarded-For`. The client is that many entries from the right; anything further left was written by the client and is ignored. Use `1` for a single reverse proxy such as nginx with `proxy_add_x_forwarded_for`.

When the header or entry is missing or not an IP address, the IP is `unknown`: per-IP limits are skipped (one shared bucket would let one client lock everyone out), and the per-account limits and the bcrypt ceiling still apply. `AUTH_TRUST_HOST` no longer affects rate limiting.

In production, one of the two variables is required. `src/env.js` throws at startup when both are empty, so `next start` (via `next.config.js`) and the standalone `node server.js` (via `src/instrumentation.ts`, which exits) both refuse to run. `next build` and `next lint` skip this check, since their environment is not the server's, and `SKIP_ENV_VALIDATION` skips it entirely (the server then only logs a warning). `TRUSTED_PROXY_HOPS` must be a positive integer.
