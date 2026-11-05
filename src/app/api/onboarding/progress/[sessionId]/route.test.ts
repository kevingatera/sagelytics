import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  owners: new Map<string, string>(),
}));

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

type TestProgress = {
  sessionId: string;
  step: string;
  percentage: number;
  message: string;
  timestamp: Date;
};

// Plain function mocks rather than methods, so tests can reference them directly.
const svc = vi.hoisted(() => ({
  getSessionOwner: vi.fn(async (sessionId: string) => state.owners.get(sessionId) ?? null),
  getProgress: vi.fn(async () => null),
  subscribeToProgress: vi.fn(
    async (_sessionId: string, _callback: (progress: TestProgress) => void): Promise<() => void> => vi.fn(),
  ),
}));

vi.mock('~/lib/services/progress-service', () => ({ progressService: svc }));

import { GET } from './route';

const ALICE = 'user-alice';
const BOB = 'user-bob';
const SESSION = `${ALICE}_1700000000000`;
const MAX_LIFETIME_MS = 15 * 60 * 1000;

const openAbortControllers: AbortController[] = [];

function streamRequest(signal?: AbortSignal) {
  const controller = new AbortController();
  openAbortControllers.push(controller);
  return new Request(`http://localhost/api/onboarding/progress/${SESSION}`, {
    signal: signal ?? controller.signal,
  }) as unknown as NextRequest;
}

function params(sessionId: string) {
  return { params: Promise.resolve({ sessionId }) };
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  state.session = { user: { id: ALICE } };
  state.owners.clear();
  state.owners.set(SESSION, ALICE);
});

afterEach(() => {
  for (const controller of openAbortControllers.splice(0)) {
    controller.abort();
  }
  vi.useRealTimers();
});

describe('onboarding progress stream access', () => {
  it('rejects unauthenticated requests before looking at the session', async () => {
    state.session = null;

    const res = await GET(streamRequest(), params(SESSION));

    expect(res.status).toBe(401);
    expect(svc.subscribeToProgress).not.toHaveBeenCalled();
  });

  it('returns 404 for a session owned by another user without subscribing', async () => {
    state.session = { user: { id: BOB } };

    const res = await GET(streamRequest(), params(SESSION));

    expect(res.status).toBe(404);
    expect(svc.subscribeToProgress).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown session, the same as a foreign one', async () => {
    const res = await GET(streamRequest(), params('nobody_0'));

    expect(res.status).toBe(404);
    expect(svc.subscribeToProgress).not.toHaveBeenCalled();
  });

  it('streams progress to the session owner', async () => {
    const res = await GET(streamRequest(), params(SESSION));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(svc.subscribeToProgress).toHaveBeenCalledWith(SESSION, expect.any(Function));
  });

  it('releases the subscription when the client leaves before subscribing finishes', async () => {
    let resolveSubscribe!: (cleanup: () => void) => void;
    vi.mocked(svc.subscribeToProgress).mockImplementationOnce(
      () => new Promise<() => void>((resolve) => { resolveSubscribe = resolve; }),
    );
    const controller = new AbortController();

    await GET(streamRequest(controller.signal), params(SESSION));
    controller.abort();

    const cleanup = vi.fn();
    resolveSubscribe(cleanup);
    await flush();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('caps open streams per user and frees a slot when one closes', async () => {
    const controllers = [new AbortController(), new AbortController(), new AbortController()];
    for (const c of controllers) {
      const res = await GET(streamRequest(c.signal), params(SESSION));
      expect(res.status).toBe(200);
    }

    const blocked = await GET(streamRequest(), params(SESSION));
    expect(blocked.status).toBe(429);

    controllers[0]!.abort();
    await flush();

    const allowed = await GET(streamRequest(), params(SESSION));
    expect(allowed.status).toBe(200);
  });

  it('tears down the subscription when the stream reaches its lifetime limit', async () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();
    vi.mocked(svc.subscribeToProgress).mockResolvedValueOnce(cleanup);

    await GET(streamRequest(), params(SESSION));
    await vi.advanceTimersByTimeAsync(0);
    expect(cleanup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(MAX_LIFETIME_MS);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('closes the stream after a terminal step and removes its subscription', async () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();
    let onProgress!: (progress: TestProgress) => void;
    vi.mocked(svc.subscribeToProgress).mockImplementationOnce(
      async (_id, callback) => {
        onProgress = callback;
        return cleanup;
      },
    );

    await GET(streamRequest(), params(SESSION));
    await vi.advanceTimersByTimeAsync(0);

    onProgress({ sessionId: SESSION, step: 'complete', percentage: 100, message: 'done', timestamp: new Date() });
    expect(cleanup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
