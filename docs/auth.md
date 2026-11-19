# Authentication

Next-auth v5 with JWT sessions (`src/server/auth/config.ts`), with Google and email/password sign-in.

## Email verification

- Registration (`POST /api/auth/register`) creates the account with `email_verified = null` and emails a link to `/verify-email?token=…`. New and existing emails get the same 200 response. An existing address gets a "you already have an account" email instead of a verification link.
- Password sign-in is refused until `email_verified` is set. The login form says the email is unconfirmed only after the correct password; anything else gets the generic "Invalid email or password".
- `/verify-email` confirms on a button click, not on page load, so link scanners cannot use up the token. Without a token, the page shows a resend form (`POST /api/auth/resend-verification`, which answers the same way for every email).
- Google accounts are created verified. Google sign-in is refused unless Google reports `email_verified`.
- A successful password reset also marks the email verified, since the reset link proves the user owns the mailbox.

Without SMTP (`SMTP_HOST`, `EMAIL_FROM`, `NEXTAUTH_URL`), registration still succeeds but sends nothing, and the page says so. Forgot-password and resend return 503.

## Tokens

Verification and reset tokens share `sg_verification_token`. Each `identifier` is `verify:<email>` or `reset:<email>`. Tokens are 32 random bytes (base64url). Only their SHA-256 is stored, so lookups compare hashes and never the raw value. Each token is consumed once with `DELETE … RETURNING`, filtered on purpose and expiry. A reset consumes the token, sets the password and bumps `session_version` in one transaction. Verification links last 24 hours and reset links last 1 hour. Issuing a new token replaces the previous one of the same purpose.

## Session invalidation

`sg_user.session_version` is copied into the JWT at sign-in. The `jwt` callback re-reads it at most once every 60 seconds per token and ends the session when it differs. A password reset bumps it, so every existing session ends within about a minute.

## Rate limits

`src/server/rate-limit.ts` keeps fixed-window counters in Redis (`REDIS_URL`, or `REDIS_HOST`), with an in-process fallback when Redis is unset or failing. The fallback is logged once.

| Endpoint | Limits | Over the limit |
| --- | --- | --- |
| Register | 5/hour per IP, 3/hour per email; bcrypt budget 30/min (unknown IP) or 300/min (known IP) | 429 with `Retry-After` |
| Forgot password, resend verification | 5/hour per IP; 1/minute and 5/day per email | Same 200, nothing sent |
| Credentials sign-in | 10 per 15 min per IP+email, 50 per 15 min per IP; bcrypt budget 120/min (unknown IP) or 1200/min (known IP) | "Too many attempts" |
| Reset password | 10/hour per IP before the token lookup; bcrypt budget 30/min (unknown IP) or 300/min (known IP) | 429 with `Retry-After` |

The bcrypt budgets are per endpoint and come in two buckets. Requests whose client IP is unknown share the small one, so per-IP limits being skipped does not leave bcrypt unbounded. Requests with a known IP are already bounded per IP and share a ceiling ten times larger that only acts as a CPU backstop, so a flood without a usable IP cannot lock out identified clients. A client's own limits are checked first; a request they refuse does not spend either budget. Reset looks up the token by its hash before hashing the new password, so a made-up token costs one indexed query and no bcrypt.

Emails are trimmed and lowercased before every comparison.

### Client IP

The client IP comes only from a source the deployment configures:

- `CLIENT_IP_HEADER`: a header the edge always overwrites, for example `cf-connecting-ip` behind Cloudflare (staging runs behind a Cloudflare tunnel). Only this header is read.
- `TRUSTED_PROXY_HOPS`: the number of proxies in front of the app that append to `X-Forwarded-For`. The client is that many entries from the right; anything further left was written by the client and is ignored. Use `1` for a single reverse proxy such as nginx with `proxy_add_x_forwarded_for`.

With neither set, or when the value is missing or not an IP address, the IP is `unknown`: per-IP limits are skipped (one shared bucket would let one client lock everyone out), and the per-email and endpoint-wide limits still apply. `AUTH_TRUST_HOST` no longer affects rate limiting.
