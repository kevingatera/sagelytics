import { ConfigService } from '@nestjs/config';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { ModelManagerService } from '../../shared/services/model-manager.service';
import type { Env } from '../../env';

// The homepage LLM call is bounded by the caller's stage deadline, so a slow model cannot cost the
// stage its deterministic fallback. Time is virtual, so the bound is exact.
const content =
  'Standard Room - $220 per night. Comfortable room with garden views.';

function build(withBatchProcessing: jest.Mock) {
  const modelManager = {
    withBatchProcessing,
  } as unknown as ModelManagerService;
  const config = new ConfigService({ SPIDER_API_KEY: 'test-key' });
  return new WebsiteDiscoveryService(
    modelManager,
    config as unknown as ConfigService<Env, true>,
  );
}

describe('WebsiteDiscoveryService LLM bound', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('falls back to text extraction when the LLM does not answer within the stage deadline', async () => {
    const service = build(jest.fn(() => new Promise<never>(() => undefined)));

    const promise = service['analyzeContentWithLLM'](
      content,
      [],
      Date.now() + 18_000,
    );
    await jest.advanceTimersByTimeAsync(12_000);
    const result = await promise;

    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products[0].name).toContain('Standard Room');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('bounds a near-deadline call at 1 s, the floor', async () => {
    const service = build(jest.fn(() => new Promise<never>(() => undefined)));

    const promise = service['analyzeContentWithLLM'](
      content,
      [],
      Date.now() + 2_500,
    );
    await jest.advanceTimersByTimeAsync(1_000);
    const result = await promise;

    expect(result.products.length).toBeGreaterThan(0);
  });

  it('clears its timer when the LLM answers in time', async () => {
    const service = build(
      jest.fn(() =>
        Promise.resolve({ content: '{"products":[],"services":[]}' }),
      ),
    );

    const result = await service['analyzeContentWithLLM'](
      content,
      [],
      Date.now() + 18_000,
    );

    expect(result).toEqual({ products: [], services: [] });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the 30 s default when no deadline is given', async () => {
    const service = build(jest.fn(() => new Promise<never>(() => undefined)));
    let settled = false;

    const promise = service['analyzeContentWithLLM'](content, []).then(
      (value) => {
        settled = true;
        return value;
      },
    );
    await jest.advanceTimersByTimeAsync(29_000);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1_000);
    await promise;
    expect(settled).toBe(true);
  });
});
