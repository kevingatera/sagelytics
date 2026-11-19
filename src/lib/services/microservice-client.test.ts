import { throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/microservices', () => ({
  Transport: { TCP: 'TCP' },
  ClientProxyFactory: {
    create: () => ({ send: () => throwError(() => new Error('microservice down')) }),
  },
}));

import { MicroserviceClient } from './microservice-client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MicroserviceClient.discoverCompetitors error log', () => {
  it('logs the catalog host only, never its path, query or credentials', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      MicroserviceClient.getInstance().discoverCompetitors({
        domain: 'acme.example',
        userId: 'user-alice',
        businessType: 'ecommerce',
        knownCompetitors: ['rival.example'],
        productCatalogUrl: 'https://u:pw@shop.example/private/feed.xml?sig=s3cret&token=t0k',
      }),
    ).rejects.toThrow('microservice down');

    const call = errorLog.mock.calls.find(([message]) =>
      String(message).includes('Discovery request failed'),
    );
    expect(call).toBeDefined();
    const logged = JSON.stringify(call);
    expect(logged).not.toMatch(/s3cret|t0k|pw@|private|feed\.xml/);
    expect(call?.[1]).toMatchObject({
      domain: 'acme.example',
      userId: 'user-alice',
      businessType: 'ecommerce',
      catalogHost: 'shop.example',
    });
    expect(call?.[1]).not.toHaveProperty('requestData');
  });
});
