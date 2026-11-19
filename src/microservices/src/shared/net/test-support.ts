import type { LookupAddress } from 'dns';
import type {
  LookupFn,
  TransportRequest,
  TransportResponse,
} from './safe-fetch';

/**
 * Network fakes for specs: a DNS table and canned HTTP replies, so a spec exercises the real
 * guard without DNS or sockets.
 */

/** Hostname to addresses. Unknown names fail like getaddrinfo. */
export function fakeLookup(table: Record<string, string | string[]>): LookupFn {
  return (hostname: string) => {
    const entry = table[hostname];
    if (entry === undefined) {
      return Promise.reject(
        Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), {
          code: 'ENOTFOUND',
        }),
      );
    }
    const addresses: LookupAddress[] = (
      Array.isArray(entry) ? entry : [entry]
    ).map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
    return Promise.resolve(addresses);
  };
}

export function reply(
  status: number,
  body = '',
  headers: Record<string, string> = {},
): TransportResponse {
  return { status, headers: new Headers(headers), body: Buffer.from(body) };
}

/** The address a request's pinned lookup hands to the socket. */
export function pinnedAddress(request: TransportRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    request.lookup(request.url.hostname, { all: true }, (error, addresses) => {
      if (error) {
        reject(error);
        return;
      }
      resolve((addresses as LookupAddress[])[0].address);
    });
  });
}
