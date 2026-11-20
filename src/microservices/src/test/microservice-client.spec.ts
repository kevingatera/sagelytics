import { Observable, of, throwError } from 'rxjs';

// Finding 4: the TCP client gives every request a response deadline, so a stalled microservice
// cannot hold a caller indefinitely.
const mockSend = jest.fn();
// The client lives outside this package, so it resolves its own copy of @nestjs/microservices.
// The mock must target that resolved path, or the real TCP client would be used.
jest.mock(
  require.resolve('@nestjs/microservices', {
    paths: [require('path').resolve(__dirname, '../../../lib/services')],
  }),
  () => ({
    ClientProxyFactory: { create: jest.fn(() => ({ send: mockSend })) },
    Transport: { TCP: 'tcp' },
  }),
);

process.env.MICROSERVICE_RESPONSE_TIMEOUT_MS = '7000';
process.env.MICROSERVICE_DISCOVERY_TIMEOUT_MS = '5000';

import {
  discoveryStartedNoPaidWork,
  DiscoveryFailedError,
  MicroserviceClient,
} from '../../../lib/services/microservice-client';

const silent = () => new Observable<never>(() => undefined);

describe('MicroserviceClient response deadlines', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSend.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails a discovery request that gets no response within the discovery deadline', async () => {
    // The configured 5 s is below the 90 s floor, so the floor applies and the budget always fits.
    mockSend.mockReturnValue(silent());
    const outcome = MicroserviceClient.getInstance()
      .discoverCompetitors({
        domain: 'example.com',
        userId: 'user-1',
        businessType: 'hospitality',
        productCatalogUrl: '',
      })
      .then(
        () => 'resolved',
        (error: Error) => error.message,
      );

    await jest.advanceTimersByTimeAsync(90_000);

    expect(await outcome).toBe(
      'Microservice discover_competitors did not respond within 90 seconds',
    );
  });

  it('applies the general response deadline to other requests', async () => {
    mockSend.mockReturnValue(silent());
    const outcome = MicroserviceClient.getInstance()
      .discoverWebsiteContent('example.com')
      .then(
        () => 'resolved',
        (error: Error) => error.message,
      );

    await jest.advanceTimersByTimeAsync(7_000);

    expect(await outcome).toBe(
      'Microservice discover_website_content did not respond within 7 seconds',
    );
  });

  it('returns a response that arrives before the deadline', async () => {
    mockSend.mockReturnValue(
      of({
        competitors: [],
        recommendedSources: [],
        searchStrategy: {},
        stats: { totalDiscovered: 0, newCompetitors: 0, existingCompetitors: 0, failedAnalyses: 0 },
      }),
    );

    const result = await MicroserviceClient.getInstance().discoverCompetitors({
      domain: 'example.com',
      userId: 'user-1',
      businessType: 'hospitality',
      productCatalogUrl: '',
    });

    expect(result.competitors).toEqual([]);
  });
});

describe('MicroserviceClient discovery deadline', () => {
  const request = {
    domain: 'example.com',
    userId: 'user-1',
    businessType: 'hospitality',
    productCatalogUrl: '',
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
    mockSend.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends the service a deadline 10 s before its own 90 s TCP timeout', async () => {
    mockSend.mockReturnValue(of({ competitors: [] }));

    await MicroserviceClient.getInstance().discoverCompetitors(request);

    expect(mockSend).toHaveBeenCalledWith('discover_competitors', {
      ...request,
      deadlineAt: 1_000_000 + 80_000,
    });
  });

  it('turns a service failure with a paid call count into a typed error', async () => {
    mockSend.mockReturnValue(
      throwError(() => ({
        code: 'DISCOVERY_FAILED',
        message: 'Competitor discovery ran out of time',
        paidCallsStarted: 0,
      })),
    );

    const error: unknown = await MicroserviceClient.getInstance()
      .discoverCompetitors(request)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiscoveryFailedError);
    expect((error as DiscoveryFailedError).paidCallsStarted).toBe(0);
    expect(discoveryStartedNoPaidWork(error)).toBe(true);
  });

  it.each([
    [
      'a run that started paid calls',
      { code: 'DISCOVERY_FAILED', paidCallsStarted: 3 },
    ],
    ['an unknown count', { code: 'DISCOVERY_FAILED', paidCallsStarted: null }],
    [
      'an untyped service error',
      { status: 'error', message: 'Internal server error' },
    ],
  ])('does not report zero paid calls for %s', async (_name, payload) => {
    mockSend.mockReturnValue(throwError(() => payload));

    const error: unknown = await MicroserviceClient.getInstance()
      .discoverCompetitors(request)
      .catch((e: unknown) => e);

    expect(discoveryStartedNoPaidWork(error)).toBe(false);
  });

  it('does not report zero paid calls after a transport timeout', async () => {
    mockSend.mockReturnValue(silent());
    const outcome = MicroserviceClient.getInstance()
      .discoverCompetitors(request)
      .catch((e: unknown) => e);

    await jest.advanceTimersByTimeAsync(90_000);

    expect(discoveryStartedNoPaidWork(await outcome)).toBe(false);
  });
});
