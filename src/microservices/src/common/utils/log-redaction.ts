/**
 * Log-safe forms of URLs. Catalog and Redis URLs can carry credentials in the userinfo
 * or signed tokens in the query, so logs get the host only or a masked URL.
 */

const withScheme = (url: string): string =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;

/** Lowercase host of a catalog URL, without port, path, query or credentials. */
export function catalogHostForLog(url: string | null | undefined): string | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(withScheme(trimmed)).hostname.toLowerCase() || null;
  } catch {
    return '[invalid url]';
  }
}

/**
 * Scheme, host and path of a URL, without userinfo, query or fragment. Accepts any
 * value, since some callers log unvalidated input.
 */
export function urlForLog(value: unknown): string {
  if (typeof value !== 'string') {
    return value && typeof value === 'object' ? '[non-string url]' : String(value);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(withScheme(trimmed));
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    const noQuery = trimmed.split(/[?#]/)[0] ?? '';
    return noQuery.replace(/^([a-z][a-z0-9+.-]*:\/\/)?[^/]*@/i, '$1');
  }
}

/**
 * Masks any userinfo (user and password, password only, or user only) and drops the
 * query string and fragment. Scheme, host, port and the database path are kept.
 */
export function maskRedisUrl(url: string | null | undefined): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return '';
  }
  try {
    const parsed = new URL(trimmed);
    const userinfo = parsed.username || parsed.password ? '***@' : '';
    return `${parsed.protocol}//${userinfo}${parsed.host}${parsed.pathname}`;
  } catch {
    // Not a parseable URL: still never print anything before an '@' or after '?' or '#'.
    const noQuery = trimmed.split(/[?#]/)[0] ?? '';
    return noQuery.replace(/^([a-z][a-z0-9+.-]*:\/\/)?.*@/i, '$1***@');
  }
}
