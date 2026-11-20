import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';
import { AgentToolsService } from '../../competitor/services/agent-tools.service';
import { ModelManagerService } from './model-manager.service';
import { createPaidRun } from './paid-work-deadline';

// The real model queue with the provider HTTP call mocked at fetch. Time is virtual: a blocking
// item holds the queue while the run's deadline passes behind it.
const MODEL = 'gemini-2.5-flash';

function geminiReply(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: { role: 'model', parts: [{ text }] },
          finishReason: 'STOP',
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function createModelManager(): ModelManagerService {
  return new ModelManagerService(
    new ConfigService({
      GEMINI_API_KEY: 'test-key',
      GROQ_API_KEY: 'test-key',
    }) as unknown as ConfigService<Env, true>,
  );
}

/** Occupies the model's queue until `ms` of virtual time has passed. Sends nothing. */
function blockQueue(
  manager: ModelManagerService,
  ms: number,
  model = MODEL,
): Promise<unknown> {
  return manager.withBatchProcessing(
    () => new Promise((resolve) => setTimeout(() => resolve('done'), ms)),
    'blocker',
    model,
  );
}

describe('bounded model queue', () => {
  const realFetch = global.fetch;
  let provider: jest.Mock;
  let manager: ModelManagerService;

  beforeEach(() => {
    jest.useFakeTimers();
    provider = jest.fn(() => Promise.resolve(geminiReply('["ok"]')));
    global.fetch = provider as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    manager = createModelManager();
  });

  afterEach(() => {
    manager.onModuleDestroy();
    global.fetch = realFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drops a queued call whose run aborts while it waits', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 1_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(new Error('deadline')), 1_000);
    const blocker = blockQueue(manager, 5_000);
    const queued = manager.invokeQueued(
      'queries',
      run.signal,
      run.claimPaidCall,
      MODEL,
    );
    const rejected = expect(queued).rejects.toThrow('deadline');

    await jest.advanceTimersByTimeAsync(1_000);
    await rejected;
    await jest.advanceTimersByTimeAsync(10_000);
    await blocker;

    expect(provider).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(0);
  });

  it('drops a queued call whose deadline passed even if its signal never aborted', async () => {
    const run = createPaidRun({
      deadlineAt: Date.now() + 1_000,
      signal: new AbortController().signal,
    });
    const blocker = blockQueue(manager, 5_000);
    const queued = manager.invokeQueued(
      'queries',
      run.signal,
      run.claimPaidCall,
      MODEL,
    );
    const rejected = expect(queued).rejects.toThrow(
      'Paid work deadline exceeded',
    );

    await jest.advanceTimersByTimeAsync(6_000);
    await rejected;
    await blocker;

    expect(provider).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(0);
  });

  it('counts and sends a queued call dispatched before the deadline, with the run signal', async () => {
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 60_000,
      signal: controller.signal,
    });
    const blocker = blockQueue(manager, 5_000);
    const queued = manager.invokeQueued(
      'queries',
      run.signal,
      run.claimPaidCall,
      MODEL,
    );

    expect(run.paidCallsStarted).toBe(0);
    await jest.advanceTimersByTimeAsync(6_000);
    await blocker;

    await expect(queued).resolves.toEqual({ content: '["ok"]' });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(run.paidCallsStarted).toBe(1);
    const init = (provider.mock.calls[0] as [string, RequestInit])[1];
    controller.abort();
    expect(init.signal?.aborted).toBe(true);
  });

  it('drops a queued feature extraction from the agent tools after the deadline', async () => {
    const tools = new AgentToolsService(
      new ConfigService({}) as unknown as ConfigService<Env, true>,
      manager,
    );
    const controller = new AbortController();
    const run = createPaidRun({
      deadlineAt: Date.now() + 1_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(new Error('deadline')), 1_000);
    // Feature extraction picks its model by prompt, so block every queue it could use.
    const blockers = [
      'gemini-2.5-flash',
      'qwen/qwen3-32b',
      'gemini-2.0-flash',
      'deepseek-r1-distill-llama-70b',
      'llama3-8b-8192',
    ].map((model) => blockQueue(manager, 5_000, model));
    const features = tools.analysis.extractFeatures('lodge text', run);
    const rejected = expect(features).rejects.toThrow('deadline');

    await jest.advanceTimersByTimeAsync(1_000);
    await rejected;
    await jest.advanceTimersByTimeAsync(10_000);
    await Promise.all(blockers);

    expect(provider).not.toHaveBeenCalled();
    expect(run.paidCallsStarted).toBe(0);
  });
});
