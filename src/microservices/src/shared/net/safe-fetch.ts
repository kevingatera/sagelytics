import dns, { type LookupAddress } from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';
import type { Readable } from 'stream';
import zlib from 'zlib';
import {
  hostnameProblem,
  isPublicAddress,
  stripBrackets,
} from './address-policy';

/**
 * Fetch for URLs a user can influence (product pages, competitor sites, sitemaps).
 *
 * Every hop is checked before it is sent: http(s) only, no credentials, ports 80/443, and a
 * hostname whose every DNS answer is a public address. The connection is then pinned to the
 * vetted addresses through a custom `lookup`, so a second DNS answer (rebinding) cannot
 * redirect the socket. Redirects are followed manually and re-checked, at most 5.
 */

export const DEFAULT_ALLOWED_PORTS: readonly number[] = [80, 443];
export const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CROSS_ORIGIN_STRIPPED_HEADERS = ['authorization', 'cookie'];

export class UnsafeUrlError extends Error {
  readonly code = 'UNSAFE_URL';

  constructor(
    readonly url: string,
    readonly reason: string,
  ) {
    super(`Refused to fetch ${redactUrl(url)}: ${reason}`);
    this.name = 'UnsafeUrlError';
  }
}

export function isUnsafeUrlError(error: unknown): error is UnsafeUrlError {
  return error instanceof UnsafeUrlError;
}

export type UrlPolicy = {
  /** Ports a URL may name. Defaults to 80 and 443. */
  allowedPorts?: readonly number[];
};

export type LookupFn = (hostname: string) => Promise<LookupAddress[]>;

export type TransportRequest = {
  url: URL;
  method: 'GET' | 'HEAD';
  headers: Record<string, string>;
  lookup: net.LookupFunction;
  signal: AbortSignal;
  maxBodyBytes: number;
};

export type TransportResponse = {
  status: number;
  headers: Headers;
  body: Buffer;
};

export type Transport = (
  request: TransportRequest,
) => Promise<TransportResponse>;

export type SafeFetchDeps = {
  lookup?: LookupFn;
  transport?: Transport;
  /** Address check applied to DNS answers. Only tests should replace it. */
  isAllowedAddress?: (address: string) => boolean;
};

export type SafeFetchInit = UrlPolicy & {
  method?: 'GET' | 'HEAD';
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Bound for the whole redirect chain. Defaults to 10s. */
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodyBytes?: number;
};

export type SafeResponse = {
  /** Final URL after redirects. */
  url: string;
  status: number;
  ok: boolean;
  redirected: boolean;
  headers: Headers;
  text(): Promise<string>;
};

export type SafeFetch = (
  input: string | URL,
  init?: SafeFetchInit,
) => Promise<SafeResponse>;

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return value.slice(0, 200);
  }
}

function defaultPort(protocol: string): number {
  return protocol === 'https:' ? 443 : 80;
}

/**
 * Text-only checks: scheme, credentials, port and host literal. Does not resolve DNS, so it
 * suits URLs handed to a third party (Spider) that fetches them from its own network.
 */
export function assertSafeUrlText(
  input: string | URL,
  policy: UrlPolicy = {},
): URL {
  const raw = typeof input === 'string' ? input.trim() : input.toString();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError(raw, 'is not a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError(raw, `uses a disallowed scheme (${url.protocol})`);
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError(raw, 'contains credentials');
  }
  const port = url.port ? Number(url.port) : defaultPort(url.protocol);
  const allowedPorts = policy.allowedPorts ?? DEFAULT_ALLOWED_PORTS;
  if (!allowedPorts.includes(port)) {
    throw new UnsafeUrlError(raw, `uses a disallowed port (${port})`);
  }
  const problem = hostnameProblem(url.hostname);
  if (problem) {
    throw new UnsafeUrlError(raw, `host ${problem}`);
  }
  return url;
}

const systemLookup: LookupFn = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true });

async function resolveAllowedAddresses(
  url: URL,
  lookup: LookupFn,
  isAllowedAddress: (address: string) => boolean,
): Promise<LookupAddress[]> {
  const host = stripBrackets(url.hostname);
  const literalFamily = net.isIP(host);
  // IP literals were checked by assertSafeUrlText.
  const addresses =
    literalFamily !== 0
      ? [{ address: host, family: literalFamily }]
      : await lookup(host);

  if (addresses.length === 0) {
    throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), {
      code: 'ENOTFOUND',
    });
  }
  // One private answer is enough to refuse: the OS may pick any of them.
  const blocked = addresses.find(({ address }) => !isAllowedAddress(address));
  if (blocked) {
    throw new UnsafeUrlError(
      url.toString(),
      `host resolves to a non-public address (${blocked.address})`,
    );
  }
  return addresses;
}

/** Text checks plus DNS: every address the hostname resolves to must be public. */
export async function assertSafeUrl(
  input: string | URL,
  policy: UrlPolicy & { lookup?: LookupFn } = {},
): Promise<{ url: URL; addresses: LookupAddress[] }> {
  const url = assertSafeUrlText(input, policy);
  const addresses = await resolveAllowedAddresses(
    url,
    policy.lookup ?? systemLookup,
    isPublicAddress,
  );
  return { url, addresses };
}

/** A `lookup` for http.request that only ever answers with the vetted addresses. */
export function pinnedLookup(addresses: LookupAddress[]): net.LookupFunction {
  return (hostname, options, callback) => {
    const family = options?.family;
    const candidates =
      family === 4 || family === 6
        ? addresses.filter((entry) => entry.family === family)
        : addresses;
    if (candidates.length === 0) {
      const error = Object.assign(
        new Error(`getaddrinfo ENOTFOUND ${hostname}`),
        { code: 'ENOTFOUND' },
      );
      callback(error, '', 0);
      return;
    }
    if (options?.all) {
      callback(null, candidates);
      return;
    }
    callback(null, candidates[0].address, candidates[0].family);
  };
}

function decodedBody(
  response: http.IncomingMessage,
): Readable | zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress {
  const encoding = String(response.headers['content-encoding'] ?? '')
    .trim()
    .toLowerCase();
  if (encoding === 'gzip' || encoding === 'x-gzip') {
    return response.pipe(zlib.createGunzip());
  }
  if (encoding === 'deflate') {
    return response.pipe(zlib.createInflate());
  }
  if (encoding === 'br') {
    return response.pipe(zlib.createBrotliDecompress());
  }
  return response;
}

function toHeaders(raw: http.IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

/** Node http/https transport. Connects through `lookup`, so the vetted address is the one used. */
export const nodeTransport: Transport = (request) =>
  new Promise<TransportResponse>((resolve, reject) => {
    const client = request.url.protocol === 'https:' ? https : http;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };

    const req = client.request(
      request.url,
      {
        method: request.method,
        headers: request.headers,
        lookup: request.lookup,
        agent: false,
        signal: request.signal,
      },
      (res) => {
        const body = decodedBody(res);
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('error', fail);
        body.on('error', fail);
        body.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > request.maxBodyBytes) {
            fail(
              Object.assign(new Error('Response body too large'), {
                code: 'RESPONSE_TOO_LARGE',
              }),
            );
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        body.on('end', () => {
          if (settled) return;
          settled = true;
          resolve({
            status: res.statusCode ?? 0,
            headers: toHeaders(res.headers),
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on('error', fail);
    req.end();
  });

function abortError(reason: unknown): Error {
  if (reason instanceof Error && reason.name === 'AbortError') return reason;
  const error = new Error(
    reason instanceof Error ? reason.message : 'The operation was aborted',
  );
  error.name = 'AbortError';
  return error;
}

function raceAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError(signal.reason));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal.reason));
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function toSafeResponse(
  url: URL,
  response: TransportResponse,
  redirected: boolean,
): SafeResponse {
  return {
    url: url.toString(),
    status: response.status,
    ok: response.status >= 200 && response.status < 300,
    redirected,
    headers: response.headers,
    text: () => Promise.resolve(response.body.toString('utf8')),
  };
}

export function createSafeFetch(deps: SafeFetchDeps = {}): SafeFetch {
  const lookup = deps.lookup ?? systemLookup;
  const transport = deps.transport ?? nodeTransport;
  const isAllowedAddress = deps.isAllowedAddress ?? isPublicAddress;

  return async (input, init = {}) => {
    const policy: UrlPolicy = { allowedPorts: init.allowedPorts };
    const maxRedirects = init.maxRedirects ?? MAX_REDIRECTS;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const error = new Error('Request timed out');
      error.name = 'AbortError';
      controller.abort(error);
    }, init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const onCallerAbort = () => controller.abort(init.signal?.reason);
    if (init.signal?.aborted) {
      clearTimeout(timer);
      throw abortError(init.signal.reason);
    }
    init.signal?.addEventListener('abort', onCallerAbort, { once: true });

    let headers: Record<string, string> = {
      'Accept-Encoding': 'gzip, deflate, br',
      ...init.headers,
    };

    try {
      let url = assertSafeUrlText(input, policy);
      for (let hop = 0; ; hop++) {
        const addresses = await raceAbort(
          resolveAllowedAddresses(url, lookup, isAllowedAddress),
          controller.signal,
        );
        const response = await transport({
          url,
          method: init.method ?? 'GET',
          headers,
          lookup: pinnedLookup(addresses),
          signal: controller.signal,
          maxBodyBytes: init.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
        });

        const location = REDIRECT_STATUSES.has(response.status)
          ? response.headers.get('location')
          : null;
        if (!location) {
          return toSafeResponse(url, response, hop > 0);
        }
        if (hop >= maxRedirects) {
          throw Object.assign(
            new Error(`Too many redirects (more than ${maxRedirects})`),
            { code: 'TOO_MANY_REDIRECTS' },
          );
        }

        let next: URL;
        try {
          next = new URL(location, url);
        } catch {
          throw new UnsafeUrlError(location, 'is not a valid redirect target');
        }
        next = assertSafeUrlText(next, policy);
        if (next.origin !== url.origin) {
          headers = Object.fromEntries(
            Object.entries(headers).filter(
              ([name]) =>
                !CROSS_ORIGIN_STRIPPED_HEADERS.includes(name.toLowerCase()),
            ),
          );
        }
        url = next;
      }
    } catch (error) {
      if (controller.signal.aborted && !isUnsafeUrlError(error)) {
        throw abortError(controller.signal.reason);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', onCallerAbort);
    }
  };
}

export const safeFetch: SafeFetch = createSafeFetch();

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'EPROTO',
]);
const TLS_ERROR_CODE =
  /^(ERR_TLS_|ERR_SSL_|ERR_OSSL_|CERT_|UNABLE_TO_|DEPTH_ZERO_|SELF_SIGNED_|HPE_)/;

/**
 * True when the request failed before any HTTP response: refused or reset connection, or a
 * TLS failure. An HTTP status, a refused URL, a DNS miss or a timeout is not a connection error.
 */
export function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error) || isUnsafeUrlError(error)) return false;
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === 'string' &&
    (CONNECTION_ERROR_CODES.has(code) || TLS_ERROR_CODE.test(code))
  );
}
