import { decode as decodeJwt, type JWT, type JWTDecodeParams } from 'next-auth/jwt';

import { checkSessionVersion, type LoadSessionVersion } from './session-version';

type Decode = (params: JWTDecodeParams) => Promise<JWT | null>;

/** The checked token (or null when revoked) for each object the decoder handed to Auth.js. */
const checkedTokens = new WeakMap<object, JWT | null>();

/**
 * Session-cookie decoder that checks users.session_version once per request.
 *
 * Auth.js decodes the cookie itself in several places. The jwt callback covers ordinary
 * requests, but the OAuth callback reads `sub` from the decoded cookie and links the new provider
 * account to that user without running the callback. So the check has to happen here: a revoked
 * session, or one this request could not confirm, comes back without `sub`, and the OAuth
 * callback treats the visitor as signed out.
 *
 * The result is remembered for the returned object, and `resolveSessionToken` reuses it, so the
 * jwt callback does not repeat the lookup.
 */
export function createSessionDecode(load: LoadSessionVersion, decode: Decode = decodeJwt): Decode {
  return async (params) => {
    const payload = await decode(params);
    if (!payload) return payload;

    // Every session this app mints carries `id`; anything else is not ours to trust.
    const checked = typeof payload.id === 'string' ? await checkSessionVersion(payload, load) : null;
    if (checked?.svVerified === true) {
      checkedTokens.set(checked, checked);
      return checked;
    }

    const visible: JWT = checked ? { ...checked } : {};
    delete visible.sub;
    checkedTokens.set(visible, checked);
    return visible;
  };
}

/**
 * For the jwt callback: the token as checked by the decoder for this request, or null when the
 * session is revoked. Tokens that did not come from the decoder are checked here instead.
 */
export async function resolveSessionToken(token: JWT, load: LoadSessionVersion): Promise<JWT | null> {
  if (checkedTokens.has(token)) return checkedTokens.get(token) ?? null;
  return checkSessionVersion(token, load);
}
