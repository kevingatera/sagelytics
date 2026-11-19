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
| Register | 5/hour per IP, 3/hour per email | 429 with `Retry-After` |
| Forgot password, resend verification | 5/hour per IP; 1/minute and 5/day per email | Same 200, nothing sent |
| Credentials sign-in | 10 per 15 min per IP+email, 50 per 15 min per IP | "Too many attempts" |

Emails are trimmed and lowercased before every comparison. The client IP comes from the first `X-Forwarded-For` hop only when `TRUST_PROXY` or `AUTH_TRUST_HOST` is `true`. Otherwise it is `unknown`, and only the per-email limits apply. Set one of these only behind a proxy that overwrites the header.
