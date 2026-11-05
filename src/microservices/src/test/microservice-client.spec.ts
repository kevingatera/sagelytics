import { Observable, of } from 'rxjs';

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

import { MicroserviceClient } from '../../../lib/services/microservice-client';

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

    await jest.advanceTimersByTimeAsync(5_000);

    expect(await outcome).toBe(
      'Microservice discover_competitors did not respond within 5 seconds',
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
