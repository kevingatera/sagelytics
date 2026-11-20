import dns from 'dns';
import http from 'http';
import https from 'https';
import { ConfigService } from '@nestjs/config';
import {
  createSpiderCrawler,
  WebsiteDiscoveryService,
  type SpiderCrawler,
} from './website-discovery.service';
import type { ModelManagerService } from '../../shared/services/model-manager.service';
import type { Env } from '../../env';
import {
  createSafeFetch,
  type TransportRequest,
  type TransportResponse,
} from '../../shared/net/safe-fetch';
import { fakeLookup, reply } from '../../shared/net/test-support';

const DOMAIN = 'acme.example';
const PUBLIC_V4 = '93.184.216.34';
const PAGE =
  '<html><head><title>Acme Rooms</title></head><body><p>Standard Room - $220 per night.</p></body></html>';
const CHALLENGE =
  '<html><head><title>Just a moment...</title></head><body>cf</body></html>';

function newService(crawlUrl: jest.Mock): WebsiteDiscoveryService {
  const modelManager = {
    withBatchProcessing: jest
      .fn()
      .mockResolvedValue({ content: '{"products":[],"services":[]}' }),
  } as unknown as ModelManagerService;
  const config = new ConfigService({ SPIDER_API_KEY: 'test-key' });
  const service = new WebsiteDiscoveryService(
    modelManager,
    config as unknown as ConfigService<Env, true>,
  );
  service['spider'] = { crawlUrl } as SpiderCrawler;
  return service;
}

function noNetwork() {
  return {
    fetch: jest.spyOn(globalThis, 'fetch'),
    http: jest.spyOn(http, 'request'),
    https: jest.spyOn(https, 'request'),
  };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('WebsiteDiscoveryService SSRF guard', () => {
  // The default page fetch is the real guard; only dns.promises.lookup is replaced.
  function mockDns(table: Record<string, string>) {
    return jest.spyOn(dns.promises, 'lookup').mockImplementation(((
      hostname: string,
    ) => {
      const address = table[hostname];
      return address
        ? Promise.resolve([{ address, family: address.includes(':') ? 6 : 4 }])
        : Promise.reject(
            Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }),
          );
    }) as unknown as typeof dns.promises.lookup);
  }

  it.each([
    '127.0.0.1',
    '169.254.169.254',
    '192.168.1.10',
    'fd00::1',
    '::ffff:10.0.0.1',
  ])(
    'refuses a hostname resolving to %s with no request and no Spider fallback',
    async (address) => {
      const lookup = mockDns({ [DOMAIN]: address });
      const network = noNetwork();
      const crawlUrl = jest.fn();
      const service = newService(crawlUrl);

      const result = await service.discoverWebsiteContent(DOMAIN);

      expect(lookup).toHaveBeenCalledWith(
        DOMAIN,
        expect.objectContaining({ all: true }),
      );
      expect(network.fetch).not.toHaveBeenCalled();
      expect(network.http).not.toHaveBeenCalled();
      expect(network.https).not.toHaveBeenCalled();
      expect(crawlUrl).not.toHaveBeenCalled();
      expect(result.products).toEqual([]);
      expect(result.title).toBe('');
    },
  );

  it('refuses a private IP literal without resolving it or calling Spider', async () => {
    const lookup = mockDns({});
    const network = noNetwork();
    const crawlUrl = jest.fn();
    const service = newService(crawlUrl);

    await service.discoverWebsiteContent(
      'http://169.254.169.254/latest/meta-data/',
    );

    expect(lookup).not.toHaveBeenCalled();
    expect(network.http).not.toHaveBeenCalled();
    expect(crawlUrl).not.toHaveBeenCalled();
  });

  it('does not retry a refused URL', async () => {
    const lookup = mockDns({ [DOMAIN]: '127.0.0.1' });
    noNetwork();
    const service = newService(jest.fn());

    await service.discoverWebsiteContent(DOMAIN);

    // One lookup for the desktop tier; the refusal ends the chain and the retry loop.
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('refuses robots.txt and sitemap fetches for a private host', async () => {
    mockDns({ [DOMAIN]: '127.0.0.1' });
    const network = noNetwork();
    const service = newService(jest.fn());

    expect(await service.fetchRobotsTxt(DOMAIN)).toBeNull();
    expect(await service.discoverSitemaps(DOMAIN)).toEqual([]);
    expect(network.http).not.toHaveBeenCalled();
    expect(network.https).not.toHaveBeenCalled();
  });

  it('checks the URL text before handing it to Spider', async () => {
    const crawlUrl = jest.fn().mockResolvedValue([{ content: PAGE }]);
    const service = newService(crawlUrl);
    // Direct tiers are blocked by the site, so the chain reaches Spider.
    service['pageFetch'] = createSafeFetch({
      lookup: fakeLookup({ [DOMAIN]: PUBLIC_V4 }),
      transport: () => Promise.resolve(reply(403, 'Forbidden')),
    });

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).toHaveBeenCalledWith(
      'https://acme.example/',
      expect.any(Object),
      expect.any(AbortSignal),
    );
    expect(result.title).toBe('Acme Rooms');
  });
});

describe('WebsiteDiscoveryService HTTPS to HTTP fallback', () => {
  function withTransport(
    respond: (request: TransportRequest) => Promise<TransportResponse>,
  ) {
    const transport = jest.fn(respond);
    const crawlUrl = jest.fn().mockResolvedValue([{ content: PAGE }]);
    const service = newService(crawlUrl);
    service['pageFetch'] = createSafeFetch({
      lookup: fakeLookup({ [DOMAIN]: PUBLIC_V4 }),
      transport,
    });
    const protocols = () => transport.mock.calls.map(([r]) => r.url.protocol);
    return { service, transport, crawlUrl, protocols };
  }

  it.each([
    ['403', () => reply(403, 'Forbidden')],
    ['429', () => reply(429, 'Too many')],
    ['a challenge page', () => reply(200, CHALLENGE)],
    ['500', () => reply(500, 'oops')],
  ])('does not retry over HTTP after an HTTPS %s', async (_label, response) => {
    // A 500 goes through the existing retry delay; virtual time skips it.
    jest.useFakeTimers();
    const { service, protocols } = withTransport(() =>
      Promise.resolve(response()),
    );

    const pending = service.discoverWebsiteContent(DOMAIN, {
      llmDeadlineAt: Date.now() + 5_000,
    });
    await jest.advanceTimersByTimeAsync(20_000);
    await pending;

    expect(protocols().length).toBeGreaterThan(0);
    expect(protocols()).not.toContain('http:');
  });

  it.each(['ECONNREFUSED', 'ERR_TLS_CERT_ALTNAME_INVALID'])(
    'falls back to HTTP when HTTPS fails with %s',
    async (code) => {
      const { service, protocols, crawlUrl } = withTransport((request) =>
        request.url.protocol === 'https:'
          ? Promise.reject(Object.assign(new Error(code), { code }))
          : Promise.resolve(reply(200, PAGE)),
      );

      const result = await service.discoverWebsiteContent(DOMAIN);

      expect(protocols()).toEqual(['https:', 'http:']);
      expect(crawlUrl).not.toHaveBeenCalled();
      expect(result.title).toBe('Acme Rooms');
    },
  );
});

describe('WebsiteDiscoveryService Spider deadline', () => {
  it('aborts the Spider request when the stage deadline expires', async () => {
    jest.useFakeTimers();
    let spiderSignal: AbortSignal | undefined;
    const crawlUrl = jest.fn(
      (_url: string, _params: unknown, signal?: AbortSignal) => {
        spiderSignal = signal;
        return new Promise<never>(() => undefined);
      },
    );
    const service = newService(crawlUrl);
    service['pageFetch'] = createSafeFetch({
      lookup: fakeLookup({ [DOMAIN]: PUBLIC_V4 }),
      transport: () => Promise.resolve(reply(403, 'Forbidden')),
    });

    const pending = service.discoverWebsiteContent(DOMAIN, {
      llmDeadlineAt: Date.now() + 2_000,
    });
    await jest.advanceTimersByTimeAsync(100);
    expect(crawlUrl).toHaveBeenCalledTimes(1);
    expect(spiderSignal?.aborted).toBe(false);

    await jest.advanceTimersByTimeAsync(2_000);
    const result = await pending;

    expect(spiderSignal?.aborted).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('aborts the Spider request when the caller signal fires', async () => {
    let spiderSignal: AbortSignal | undefined;
    const caller = new AbortController();
    const crawlUrl = jest.fn(
      (_url: string, _params: unknown, signal?: AbortSignal) => {
        spiderSignal = signal;
        setImmediate(() => caller.abort());
        return new Promise<never>(() => undefined);
      },
    );
    const service = newService(crawlUrl);
    service['pageFetch'] = createSafeFetch({
      lookup: fakeLookup({ [DOMAIN]: PUBLIC_V4 }),
      transport: () => Promise.resolve(reply(403, 'Forbidden')),
    });

    const result = await service.discoverWebsiteContent(DOMAIN, {
      signal: caller.signal,
    });

    expect(spiderSignal?.aborted).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('passes the signal to the HTTP request Spider receives', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('[{"content":"ok"}]', { status: 200 }));
    const controller = new AbortController();

    const pages = await createSpiderCrawler('k').crawlUrl(
      'https://acme.example/',
      { limit: 1 },
      controller.signal,
    );

    expect(pages).toEqual([{ content: 'ok' }]);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.spider.cloud/v1/crawl');
    expect(init?.signal).toBe(controller.signal);
    expect(JSON.parse(init?.body as string)).toEqual({
      url: 'https://acme.example/',
      limit: 1,
    });
  });
});
