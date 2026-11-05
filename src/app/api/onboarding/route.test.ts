import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: { user: { id: 'user-alice', email: 'alice@example.com', name: 'Alice' } } as
    | { user: { id: string; email: string; name: string } }
    | null,
  jobs: new Map<string, string>(),
  current: true,
  discover: vi.fn(),
  updates: [] as Record<string, unknown>[],
}));

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

vi.mock('~/server/db', () => {
  type Chain = Promise<{ id: string }[]> & {
    values: () => Chain;
    set: (values: Record<string, unknown>) => Chain;
    where: () => Chain;
    onConflictDoNothing: () => Chain;
    onConflictDoUpdate: () => Chain;
    returning: () => Chain;
  };
  const chain = (): Chain =>
    Object.assign(Promise.resolve([{ id: 'row-1' }]), {
      values: () => chain(),
      set: (values: Record<string, unknown>) => {
        state.updates.push(values);
        return chain();
      },
      where: () => chain(),
      onConflictDoNothing: () => chain(),
      onConflictDoUpdate: () => chain(),
      returning: () => chain(),
    });
  return {
    db: {
      query: {
        users: { findFirst: async () => ({ id: 'user-alice', onboardingCompleted: false }) },
        userOnboarding: { findFirst: async () => undefined },
        competitors: { findFirst: async () => undefined },
      },
      insert: () => chain(),
      update: () => chain(),
    },
  };
});

vi.mock('~/server/db/queries/monitoring', () => ({
  createMonitoringTask: vi.fn(async () => undefined),
}));

vi.mock('~/lib/services/microservice-client', () => ({
  MicroserviceClient: { getInstance: () => ({ discoverCompetitors: state.discover }) },
}));

// Plain function mocks rather than methods, so tests can reference them directly.
const svc = vi.hoisted(() => ({
  setProgress: vi.fn(async () => undefined),
  setComplete: vi.fn(async () => undefined),
  setError: vi.fn(async () => undefined),
  registerSession: vi.fn(async () => undefined),
  claimOnboardingJob: vi.fn(async (userId: string, domainKey: string, sessionId: string) => {
    const key = `${userId}:${domainKey}`;
    const existing = state.jobs.get(key);
    if (existing) return { claimed: false as const, sessionId: existing };
    state.jobs.set(key, sessionId);
    return { claimed: true as const };
  }),
  isCurrentOnboardingJob: vi.fn(async () => state.current),
  releaseOnboardingJob: vi.fn(async (userId: string, domainKey: string, sessionId: string) => {
    const key = `${userId}:${domainKey}`;
    if (state.jobs.get(key) === sessionId) state.jobs.delete(key);
  }),
}));

vi.mock('~/lib/services/progress-service', () => ({ progressService: svc }));

import { POST } from './route';

function submit() {
  return POST(
    new Request('http://localhost/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        companyDomain: 'https://acme.example',
        businessType: 'saas',
        competitor1: '',
        competitor2: '',
        competitor3: '',
      }),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.session = { user: { id: 'user-alice', email: 'alice@example.com', name: 'Alice' } };
  state.jobs.clear();
  state.current = true;
  state.updates.length = 0;
  state.discover.mockReset();
});

describe('POST /api/onboarding job coordination', () => {
  it('reuses the in-flight job when the same user submits twice for one domain', async () => {
    state.discover.mockImplementation(() => new Promise(() => undefined));

    const first = await submit();
    const firstBody = (await first.json()) as { sessionId: string; reused?: boolean };
    const second = await submit();
    const secondBody = (await second.json()) as { sessionId: string; reused?: boolean };

    expect(firstBody.reused).toBeUndefined();
    expect(secondBody).toEqual({ success: true, sessionId: firstBody.sessionId, reused: true });
    await vi.waitFor(() => expect(state.discover).toHaveBeenCalledTimes(1));
  });

  it('does not finalize a job that a newer one has superseded', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });
    state.current = false;

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() =>
      expect(svc.setError).toHaveBeenCalledWith(
        body.sessionId,
        expect.stringContaining('replaced'),
      ),
    );
    expect(svc.setComplete).not.toHaveBeenCalled();
    expect(state.updates.some((u) => 'onboardingCompleted' in u)).toBe(false);
    await vi.waitFor(() => expect(svc.releaseOnboardingJob).toHaveBeenCalled());
  });

  it('finalizes a job that is still the current one', async () => {
    state.discover.mockResolvedValue({ competitors: [], userProducts: [] });

    const res = await submit();
    const body = (await res.json()) as { sessionId: string };

    await vi.waitFor(() => expect(svc.setComplete).toHaveBeenCalledWith(body.sessionId, expect.any(String)));
    expect(state.updates.some((u) => u.onboardingCompleted === true)).toBe(true);
  });

  it('releases the claim when the request fails before its job starts', async () => {
    vi.mocked(svc.setProgress).mockRejectedValueOnce(new Error('redis down'));

    const failed = await submit();
    expect(failed.status).toBe(500);
    expect(svc.releaseOnboardingJob).toHaveBeenCalledWith(
      'user-alice',
      'acme.example',
      expect.any(String),
    );

    state.discover.mockImplementation(() => new Promise(() => undefined));
    const retry = await submit();
    expect(retry.status).toBe(200);
    expect(((await retry.json()) as { reused?: boolean }).reused).toBeUndefined();
  });
});
