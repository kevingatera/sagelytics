import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import type { ModelManagerService } from '../../shared/services/model-manager.service';
import { AgentToolsService } from './agent-tools.service';

describe('AgentToolsService.search.serpSearch', () => {
  const originalFetch = global.fetch;
  const response = {
    local_results: [
      {
        title: 'Lake Lodge',
        website: 'https://www.lakelodge.test/rooms',
        rating: 4.6,
        reviews: 120,
      },
      { title: 'No Site Inn' },
    ],
    organic_results: [
      { link: 'https://directory.test/lodges', title: 'Lodge directory' },
    ],
  };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(response) }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const tools = () =>
    new AgentToolsService(
      new ConfigService({
        VALUESERP_API_KEY: 'test-key',
      }) as unknown as ConfigService<Env, true>,
      {} as ModelManagerService,
    );

  it.each(['local', 'maps'] as const)(
    'a %s search requests local listings and returns their websites',
    async (type) => {
      const results = await tools().search.serpSearch('lodges near lake', type);
      const url = new URL((fetchMock.mock.calls[0] as [string])[0]);
      expect(url.searchParams.get('tbm')).toBe('lcl');
      expect(results).toEqual([
        {
          url: 'www.lakelodge.test',
          title: 'Lake Lodge',
          rating: 4.6,
          reviewCount: 120,
          snippet: undefined,
        },
      ]);
    },
  );
});
