import { ConfigService } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';

describe('OpenRouterService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses markdown-wrapped strict filter JSON and normalizes domains', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '```json\n{"competitors":[{"domain":"https://www.Rival.com","reason":"direct match"}],"excluded":[{"domain":"booking.com","why":"ota"}]}\n```',
            },
          },
        ],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 42,
          total_tokens: 162,
          cost: '0.0041',
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new OpenRouterService(
      new ConfigService({ OPENROUTER_API_KEY: 'test-key' }),
    );

    const result = await service.strictCompetitorFilter({
      domain: 'example.com',
      businessType: 'hospitality',
      region: 'Rwanda',
      candidates: [{ domain: 'rival.com', source: 'perplexity' }],
      serpSnippets: [{ domain: 'rival.com', title: 'Rival', snippet: '...' }],
    });

    expect(result.competitors).toEqual([
      { domain: 'rival.com', reason: 'direct match' },
    ]);
    expect(result.excluded).toEqual([{ domain: 'booking.com', why: 'ota' }]);
    expect(result.usage.totalTokens).toBe(162);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces 401 errors with explicit context', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }) as unknown as typeof fetch;

    const service = new OpenRouterService(
      new ConfigService({ OPENROUTER_API_KEY: 'bad-key' }),
    );

    await expect(
      service.chatCompletion('openai/gpt-5-mini', [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: 'test' },
      ]),
    ).rejects.toThrow('OpenRouter unauthorized (401)');
  });

  it('returns empty escalation list when model output is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not-json-output' } }],
        usage: { total_tokens: 10 },
      }),
    }) as unknown as typeof fetch;

    const service = new OpenRouterService(
      new ConfigService({ OPENROUTER_API_KEY: 'test-key' }),
    );

    const result = await service.webSearchDiscovery({
      domain: 'example.com',
      businessType: 'hospitality',
      region: 'Rwanda',
    });

    expect(result.competitors).toEqual([]);
    expect(result.usage.totalTokens).toBe(10);
  });
});
