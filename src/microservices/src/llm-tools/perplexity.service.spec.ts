import { ConfigService } from '@nestjs/config';
import { PerplexityService } from './perplexity.service';

// Finding 7: nested research, fallback-model attempts and aborted requests are all accounted for.
const envelope = (content: string) => ({
  ok: true,
  json: async () => ({
    id: 'resp-1',
    choices: [{ message: { role: 'assistant', content }, index: 0 }],
    created: 1,
    model: 'sonar',
    links: [],
  }),
});

const build = (extra: Record<string, string> = {}) =>
  new PerplexityService(
    new ConfigService({ PERPLEXITY_API_KEY: 'test-key', ...extra }),
  );

describe('PerplexityService usage reporting', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports nested quick research as its own request, ahead of discovery', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        envelope(
          '{"businessName":"Lodge","insights":"based in Rwanda","products":[],"competitors":[],"sources":[]}',
        ),
      ) as unknown as typeof fetch;
    const onUsage = jest.fn();

    await build().discoverCompetitors('example.com', 'other', undefined, { onUsage });

    expect(onUsage.mock.calls.map(([event]) => event.operation)).toEqual([
      'research',
      'discover',
    ]);
  });

  it('reports the fallback model as a separate paid attempt', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'upstream failure',
      })
      .mockResolvedValueOnce(
        envelope('{"competitors":[{"name":"Rival","domain":"rival.com"}],"sources":[]}'),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const onUsage = jest.fn();

    await build({ PERPLEXITY_ENABLE_MODEL_FALLBACK: 'true' }).discoverCompetitors(
      'example.com',
      'hospitality',
      undefined,
      { onUsage },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUsage.mock.calls.map(([event]) => event.model)).toEqual([
      'sonar',
      'sonar-pro',
    ]);
  });

  it('does not dispatch once its signal has been aborted', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort(new Error('deadline passed'));

    await expect(
      build().discoverCompetitors('example.com', 'hospitality', undefined, {
        signal: controller.signal,
      }),
    ).rejects.toThrow('deadline passed');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
