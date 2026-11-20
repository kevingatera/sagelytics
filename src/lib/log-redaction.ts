/**
 * Lowercase host of a catalog URL for logs. The path, query and userinfo can carry
 * signed tokens or credentials, so they are never printed.
 */
export function catalogHostForLog(url: string | null | undefined): string | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return null;
  }
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname.toLowerCase() || null;
  } catch {
    return '[invalid url]';
  }
}
