# Authentication

Next-auth v5 with JWT sessions (`src/server/auth/config.ts`), with Google and email/password sign-in.

## Email verification

- Registration (`POST /api/auth/register`) creates the account with `email_verified = null` and emails a link to `/verify-email?token=…`. New and existing emails get the same 200 response. An existing address, verified or not, is left unchanged and gets a "you already have an account" email with a reset link instead of a verification link.
- Password sign-in is refused until `email_verified` is set. The login form says the email is unconfirmed only after the correct password; anything else gets the generic "Invalid email or password".
- `/verify-email` asks for the account password. `POST /api/auth/verify-email` takes `{ token, password }`, looks the token up by hash, checks the password with bcrypt, then in one transaction consumes the token and sets `email_verified` only if the password hash is still the one it checked. A wrong password leaves the link usable. Without a token, the page shows a resend form (`POST /api/auth/resend-verification`, which answers the same way for every email).
- Google accounts are created verified. Google sign-in is refused unless Google reports `email_verified`, and a Google sign-in marks an unverified account verified only when Google's verified email matches the stored one.
- A successful password reset also marks the email verified, since the reset link proves the user owns the mailbox, and deletes any outstanding verification link.

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
- Google users sign in with Google as before: a linked Google account signs in by its account id and does not need `email_verified`. If Google's verified email matches the stored one, that sign-in marks the account verified. If not, the account stays unverified, which only matters for its password (if it has one).

## Tokens

Verification and reset tokens share `sg_verification_token`. Each `identifier` is `verify:<email>` or `reset:<email>`. Tokens are 32 random bytes (base64url). Only their SHA-256 is stored, so lookups compare hashes and never the raw value. Each token is consumed once with `DELETE … RETURNING`, filtered on purpose and expiry. A reset consumes the token, sets the password and bumps `session_version` in one transaction. Verification links last 24 hours and reset links last 1 hour. Issuing a new token replaces the previous one of the same purpose.

## Session invalidation

`sg_user.session_version` is copied into the JWT at sign-in. A custom `jwt.decode` (`src/server/auth/session-jwt.ts`) re-reads it (a primary-key lookup) whenever Auth.js reads the session cookie, so every protected page, tRPC call and API route sees the current value, and a reset or password change ends other sessions on their next request. The `jwt` callback reuses the decoder's result, so each request still makes one lookup.

The check lives in the decoder because Auth.js's OAuth callback decodes the cookie itself and links the new provider account to its `sub` without running the `jwt` callback. A revoked session, or one this request could not confirm, decodes without `sub`, so the OAuth callback treats the visitor as signed out and links nothing to the account.

## Linking Google to an account

Auth.js links a Google account to the signed-in user when that Google account is new. The adapter's `linkAccount` (`src/server/auth/oauth-link.ts`) refuses unless Google's `id_token` reports `email_verified` for the same address as the account's stored email, ignoring case. A refused link fails the sign-in with nothing written. Signed out, Auth.js never links a Google account to an existing email (`OAuthAccountNotLinked`).

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

With neither set, or when the value is missing or not an IP address, the IP is `unknown`: per-IP limits are skipped (one shared bucket would let one client lock everyone out), and the per-account limits and the bcrypt ceiling still apply. In production the server logs a loud warning at startup (`src/instrumentation.ts`) when neither variable is set. `AUTH_TRUST_HOST` no longer affects rate limiting.
