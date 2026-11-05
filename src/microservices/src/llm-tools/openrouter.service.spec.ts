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

describe('OpenRouterService OpenAI primary path', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const primaryConfig = new ConfigService({
    OPENAI_API_KEY: 'test-openai-key',
    OPENROUTER_API_KEY: 'test-key',
  });

  it('prices token usage and parses output_text from the OpenAI responses API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text:
          '{"competitors":[{"domain":"https://www.Rival.com/","reason":"local"}],"excluded":[]}',
        output: [],
        usage: { input_tokens: 1000, output_tokens: 500 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new OpenRouterService(primaryConfig);
    const result = await service.strictCompetitorFilterViaOpenAi({
      domain: 'example.com',
      businessType: 'hospitality',
      region: 'Rwanda',
      candidates: [],
      serpSnippets: [],
    });

    expect(result.competitors).toEqual([
      { domain: 'rival.com', reason: 'local' },
    ]);
    // 1000 input tokens at $0.25/M plus 500 output tokens at $2/M.
    expect(result.usage.costUsd).toBeCloseTo(0.00125, 6);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    ) as {
      model: string;
      tools?: unknown;
    };
    expect(body.model).toBe('gpt-5-mini');
    expect(body.tools).toBeUndefined();
  });

  it('adds web search call pricing to escalation usage', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text:
          '{"competitors":[{"domain":"escalated-rival.com","reason":"web"}]}',
        output: [{ type: 'web_search_call' }],
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new OpenRouterService(primaryConfig);
    const result = await service.webSearchDiscoveryViaOpenAi({
      domain: 'example.com',
      businessType: 'hospitality',
      region: 'Rwanda',
    });

    expect(result.competitors).toEqual([
      { domain: 'escalated-rival.com', reason: 'web' },
    ]);
    // One web search call at $10 per 1,000 calls.
    expect(result.usage.costUsd).toBeCloseTo(0.01, 6);
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body,
    ) as {
      tools: Array<{ type: string }>;
    };
    expect(body.tools).toEqual([{ type: 'web_search_preview' }]);
  });

  it('rejects when OPENAI_API_KEY is missing so the caller can fall back', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new OpenRouterService(
      new ConfigService({ OPENROUTER_API_KEY: 'test-key' }),
    );

    await expect(
      service.strictCompetitorFilterViaOpenAi({
        domain: 'example.com',
        businessType: 'hospitality',
        region: 'Rwanda',
        candidates: [],
        serpSnippets: [],
      }),
    ).rejects.toThrow('OPENAI_API_KEY is required');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// Finding 7: usage is reported at the provider boundary, even when the output is unusable.
describe('OpenRouterService usage reporting', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports the cost of OpenAI output that fails JSON parsing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: 'no JSON in this answer',
        usage: { input_tokens: 1000, output_tokens: 500 },
      }),
    }) as unknown as typeof fetch;
    const service = new OpenRouterService(
      new ConfigService({ OPENAI_API_KEY: 'test-key' }),
    );
    const onUsage = jest.fn();

    await expect(
      service.strictCompetitorFilterViaOpenAi({
        domain: 'example.com',
        businessType: 'hospitality',
        region: 'Rwanda',
        candidates: [],
        serpSnippets: [],
        timeoutMs: 1000,
        onUsage,
      }),
    ).rejects.toThrow('invalid JSON');

    expect(onUsage).toHaveBeenCalledTimes(1);
    const [event] = onUsage.mock.calls[0];
    expect(event).toMatchObject({ provider: 'openai', operation: 'filter' });
    expect(event.costUsd).toBeGreaterThan(0);
  });

  it('reports unknown cost for a request that never returns, and skips dispatch once aborted', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('socket hang up'));
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new OpenRouterService(
      new ConfigService({ OPENROUTER_API_KEY: 'test-key' }),
    );
    const onUsage = jest.fn();

    await expect(
      service.chatCompletion('model-x', [{ role: 'user', content: 'hi' }], {
        onUsage,
        operation: 'filter',
      }),
    ).rejects.toThrow('socket hang up');
    expect(onUsage).toHaveBeenCalledWith({
      provider: 'openrouter',
      operation: 'filter',
      model: 'model-x',
      costUsd: null,
    });

    fetchMock.mockClear();
    const controller = new AbortController();
    controller.abort(new Error('budget spent'));
    await expect(
      service.chatCompletion('model-x', [{ role: 'user', content: 'hi' }], {
        signal: controller.signal,
        onUsage,
      }),
    ).rejects.toThrow('budget spent');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
