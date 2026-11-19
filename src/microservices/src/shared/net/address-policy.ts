import net from 'net';

/**
 * Which IP addresses and hostnames a server-side fetch of a user-influenced URL may reach.
 * Anything loopback, private, link-local, shared (CGNAT), reserved or multicast is refused,
 * including IPv4 addresses embedded in IPv6 (mapped, compatible, NAT64, 6to4).
 */

type Ipv4Range = readonly [base: number, prefix: number];

const BLOCKED_IPV4_RANGES: readonly Ipv4Range[] = [
  [ipv4('0.0.0.0'), 8], // "this" network
  [ipv4('10.0.0.0'), 8], // private
  [ipv4('100.64.0.0'), 10], // shared address space (CGNAT)
  [ipv4('127.0.0.0'), 8], // loopback
  [ipv4('169.254.0.0'), 16], // link-local, cloud metadata
  [ipv4('172.16.0.0'), 12], // private
  [ipv4('192.0.0.0'), 24], // IETF protocol assignments
  [ipv4('192.0.2.0'), 24], // TEST-NET-1
  [ipv4('192.88.99.0'), 24], // 6to4 relay anycast
  [ipv4('192.168.0.0'), 16], // private
  [ipv4('198.18.0.0'), 15], // benchmarking
  [ipv4('198.51.100.0'), 24], // TEST-NET-2
  [ipv4('203.0.113.0'), 24], // TEST-NET-3
  [ipv4('224.0.0.0'), 3], // multicast, reserved, broadcast
];

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
  '.localdomain',
];

function ipv4(address: string): number {
  const parsed = parseIpv4(address);
  if (parsed === null) throw new Error(`Invalid IPv4 constant ${address}`);
  return parsed;
}

export function parseIpv4(address: string): number | null {
  if (!net.isIPv4(address)) return null;
  const parts = address.split('.').map(Number);
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

/** Eight 16-bit groups, or null when `address` is not an IPv6 address. Accepts brackets and zone ids. */
export function parseIpv6(address: string): number[] | null {
  let text = address.replace(/^\[/, '').replace(/\]$/, '');
  const zone = text.indexOf('%');
  if (zone >= 0) text = text.slice(0, zone);
  if (!net.isIPv6(text)) return null;

  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const embedded = parseIpv4(tail);
    if (embedded === null) return null;
    text = `${text.slice(0, lastColon + 1)}${(embedded >>> 16).toString(16)}:${(embedded & 0xffff).toString(16)}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;

  const groups = [...head, ...Array<string>(missing).fill('0'), ...rest].map(
    (group) => Number.parseInt(group, 16),
  );
  if (groups.length !== 8 || groups.some((g) => !(g >= 0 && g <= 0xffff))) {
    return null;
  }
  return groups;
}

function inIpv4Range(address: number, [base, prefix]: Ipv4Range): boolean {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (address & mask) >>> 0 === base;
}

function isPublicIpv4(address: number): boolean {
  return !BLOCKED_IPV4_RANGES.some((range) => inIpv4Range(address, range));
}

function embeddedIpv4(high: number, low: number): number {
  return ((high << 16) | low) >>> 0;
}

function isPublicIpv6(g: number[]): boolean {
  const zeroUpTo = (n: number) => g.slice(0, n).every((group) => group === 0);

  if (zeroUpTo(8)) return false; // ::
  if (zeroUpTo(7) && g[7] === 1) return false; // ::1
  if (zeroUpTo(5) && g[5] === 0xffff) {
    return isPublicIpv4(embeddedIpv4(g[6], g[7])); // ::ffff:a.b.c.d mapped
  }
  if (zeroUpTo(4) && g[4] === 0xffff && g[5] === 0) {
    return isPublicIpv4(embeddedIpv4(g[6], g[7])); // ::ffff:0:a.b.c.d translated
  }
  if (zeroUpTo(6)) return isPublicIpv4(embeddedIpv4(g[6], g[7])); // ::a.b.c.d compatible
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    // 64:ff9b::/96 NAT64 carries a v4 address; 64:ff9b:1::/48 is local-use only.
    return g.slice(2, 6).every((group) => group === 0)
      ? isPublicIpv4(embeddedIpv4(g[6], g[7]))
      : false;
  }
  if (g[0] === 0x2002) return isPublicIpv4(embeddedIpv4(g[1], g[2])); // 6to4
  if (g[0] === 0x2001 && g[1] === 0) return false; // Teredo
  if (g[0] === 0x2001 && g[1] === 0xdb8) return false; // documentation
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return false; // discard
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return false; // fec0::/10 site-local
  if ((g[0] & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  return true;
}

/** True only for a globally routable unicast address. Non-IP input is not public. */
export function isPublicAddress(address: string): boolean {
  const v4 = parseIpv4(address);
  if (v4 !== null) return isPublicIpv4(v4);
  const v6 = parseIpv6(address);
  if (v6 !== null) return isPublicIpv6(v6);
  return false;
}

export function stripBrackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

/**
 * Why a URL hostname is refused before any DNS lookup, or null when it may be resolved.
 * IP literals must be public; names must not be local-only or single-label.
 */
export function hostnameProblem(hostname: string): string | null {
  const host = stripBrackets(hostname.toLowerCase());
  if (!host) return 'has no host';
  if (net.isIP(host)) {
    return isPublicAddress(host) ? null : `is a non-public address (${host})`;
  }
  const name = host.replace(/\.$/, '');
  if (!name || name === 'localhost') return 'is a local hostname';
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
    return 'is a local hostname';
  }
  // Single-label names resolve through search domains to internal hosts (e.g. "metadata").
  if (!name.includes('.')) return 'is not a fully qualified hostname';
  return null;
}
