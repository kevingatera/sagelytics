/**
 * Rules for a URL the monitoring worker will fetch. Shared by the task form and the
 * task routes, so the browser and the server reject the same values.
 */

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal'];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const [a = 0, b = 0] = parts.map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(host: string): boolean {
  if (!host.startsWith('[')) return false;
  const address = host.slice(1, -1).toLowerCase();
  return (
    address === '::' ||
    address === '::1' ||
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    address.startsWith('fe80') ||
    address.startsWith('::ffff:')
  );
}

/**
 * Returns the normalized URL when `value` is a public http(s) page the worker may
 * fetch, or null otherwise. Hostnames are not resolved here, so this blocks literal
 * private addresses and local names only.
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

export const MONITORABLE_URL_MESSAGE = 'Enter a public http(s) product page URL';
