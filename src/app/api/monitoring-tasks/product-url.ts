/**
 * Rules for a URL the monitoring worker will fetch. Shared by the task form and the
 * task routes, so the browser and the server reject the same values.
 */

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal'];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const [a = 0, b = 0, c = 0] = parts.map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

// URL parsing writes IPv6 hosts compressed and in hex, e.g. [::ffff:7f00:1] or [::7f00:1].
function isPrivateIpv6(host: string): boolean {
  if (!host.startsWith('[')) return false;
  const address = host.slice(1, -1).toLowerCase();
  const first = address.startsWith('::') ? 0 : Number.parseInt(address.split(':')[0] ?? '', 16);
  return (
    address === '::' ||
    address === '::1' ||
    /^::[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(address) || // IPv4-compatible
    address.startsWith('::ffff:') ||
    address.startsWith('64:ff9b:') ||
    (first & 0xfe00) === 0xfc00 || // fc00::/7
    (first & 0xffc0) === 0xfe80 || // fe80::/10
    (first & 0xff00) === 0xff00 // multicast
  );
}

/**
 * Returns the normalized URL when `value` is a public http(s) page the worker may
 * fetch, or null otherwise. Hostnames are not resolved here, so this blocks literal
 * private addresses and local names only.
 *
 * The app never fetches these URLs itself; it stores them and hands them to the
 * microservice. The DNS check (every address the host resolves to must be public,
 * with the connection pinned to that address and each redirect re-checked) is
 * enforced there, in src/microservices/src/shared/net/safe-fetch.ts.
 */
export function toMonitorableUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  const isIpv6 = host.startsWith('[');
  if (!host || host === 'localhost') return null;
  if (!isIpv6 && !host.includes('.')) return null;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) return null;

  return url.toString();
}

/** Keeps the entries whose `url` passes `toMonitorableUrl`, with the URL normalized. */
export function monitorableEntries<T extends { url?: string | null }>(
  entries: readonly T[] | undefined,
): Array<T & { url: string }> {
  return (entries ?? []).flatMap((entry) => {
    const url = toMonitorableUrl(entry.url ?? '');
    return url ? [{ ...entry, url }] : [];
  });
}

export const MONITORABLE_URL_MESSAGE = 'Enter a public http(s) product page URL';
