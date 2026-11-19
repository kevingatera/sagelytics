import { ConfigService } from '@nestjs/config';
import {
  WebsiteDiscoveryService,
  type SpiderCrawler,
} from './website-discovery.service';
import type { ModelManagerService } from '../../shared/services/model-manager.service';
import type { Env } from '../../env';
import {
  createSafeFetch,
  type TransportRequest,
} from '../../shared/net/safe-fetch';
import { fakeLookup, reply } from '../../shared/net/test-support';

const DOMAIN = 'acme.example';
const PAGE =
  '<html><head><title>Acme Rooms</title></head><body><h1>Rooms</h1><p>Standard Room - $220 per night.</p></body></html>';
const CHALLENGE =
  '<html><head><title>Just a moment...</title></head><body>cf</body></html>';

type Reply = { status: number; body: string };

function isMobile(userAgent: string): boolean {
  return userAgent.includes('iPhone');
}

// Page fetches go through the real SSRF guard with a public DNS answer and a fake socket.
let transport: jest.Mock<Promise<ReturnType<typeof reply>>, [TransportRequest]>;

function serveFetch(respond: (userAgent: string) => Reply) {
  transport = jest.fn((request: TransportRequest) => {
    const { status, body } = respond(request.headers['User-Agent'] ?? '');
    return Promise.resolve(reply(status, body));
  });
  return transport;
}

function build(crawlUrl: jest.Mock) {
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
  service['pageFetch'] = createSafeFetch({
    lookup: fakeLookup({ [DOMAIN]: '93.184.216.34' }),
    transport: (request) => transport(request),
  });
  return service;
}

describe('WebsiteDiscoveryService fallback chain', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls through to mobile and then Spider when the desktop fetch returns 403', async () => {
    serveFetch(() => ({ status: 403, body: 'Forbidden' }));
    const crawlUrl = jest.fn().mockResolvedValue([{ content: PAGE }]);
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).toHaveBeenCalledTimes(1);
    expect(result.title).toBe('Acme Rooms');
  });

  it('retries with the mobile user agent after a desktop 403', async () => {
    const fetchMock = serveFetch((userAgent) =>
      isMobile(userAgent)
        ? { status: 200, body: PAGE }
        : { status: 403, body: 'Forbidden' },
    );
    const crawlUrl = jest.fn();
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    const agents = fetchMock.mock.calls.map(
      ([request]) => request.headers['User-Agent'],
    );
    expect(agents.some((agent) => agent?.includes('iPhone'))).toBe(true);
    expect(crawlUrl).not.toHaveBeenCalled();
    expect(result.title).toBe('Acme Rooms');
  });

  it('returns a clean degraded result when Spider also fails', async () => {
    serveFetch(() => ({ status: 403, body: 'Forbidden' }));
    const crawlUrl = jest.fn().mockRejectedValue(new Error('spider down'));
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://acme.example/');
    expect(result.products).toEqual([]);
    expect(result.services).toEqual([]);
  });

  it('falls through on a desktop 429 instead of sleeping and retrying', async () => {
    serveFetch((userAgent) =>
      isMobile(userAgent)
        ? { status: 200, body: PAGE }
        : { status: 429, body: 'Too many' },
    );
    const crawlUrl = jest.fn();
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).not.toHaveBeenCalled();
    expect(result.title).toBe('Acme Rooms');
  });

  it('treats a bot-wall challenge served with HTTP 200 as blocked', async () => {
    serveFetch(() => ({ status: 200, body: CHALLENGE }));
    const crawlUrl = jest.fn().mockResolvedValue([{ content: PAGE }]);
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).toHaveBeenCalledTimes(1);
    expect(result.title).toBe('Acme Rooms');
  });

  it('does not call Spider when the site does not exist', async () => {
    serveFetch(() => ({ status: 404, body: 'Not found' }));
    const crawlUrl = jest.fn();
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN);

    expect(crawlUrl).not.toHaveBeenCalled();
    expect(result.products).toEqual([]);
  });

  it('skips every tier and returns a degraded result once the stage deadline has passed', async () => {
    const fetchMock = serveFetch(() => ({ status: 200, body: PAGE }));
    const crawlUrl = jest.fn();
    const service = build(crawlUrl);

    const result = await service.discoverWebsiteContent(DOMAIN, {
      llmDeadlineAt: Date.now() - 1,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(crawlUrl).not.toHaveBeenCalled();
    expect(result.products).toEqual([]);
  });
});
