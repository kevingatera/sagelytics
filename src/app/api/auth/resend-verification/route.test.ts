import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: undefined as undefined | { id: string; password: string | null; emailVerified: Date | null },
  tokens: [] as Array<{ identifier: string }>,
  sendMail: vi.fn(),
  afterTasks: [] as Array<() => unknown>,
  limitCheck: vi.fn(),
}));

vi.mock('~/env', () => ({ env: { NEXTAUTH_URL: 'https://app.example.test' } }));
vi.mock('next/server', () => ({
  after: (task: () => unknown) => {
    state.afterTasks.push(task);
  },
}));
vi.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: state.sendMail }) }));
vi.mock('~/server/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getRateLimiter: () => ({ check: state.limitCheck }) };
});
vi.mock('~/server/db', () => ({
  db: {
    query: { users: { findFirst: async () => state.user } },
    delete: () => ({ where: async () => undefined }),
    insert: () => ({
      values: async (row: { identifier: string }) => {
        state.tokens.push(row);
      },
    }),
  },
}));

import { POST } from './route';

function postRequest(email: string) {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

async function respond(email = 'owner@example.test') {
  const res = await POST(postRequest(email));
  const body: unknown = await res.json();
  for (const task of state.afterTasks.splice(0)) await task();
  return { status: res.status, body };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SMTP_HOST', 'smtp.example.test');
  vi.stubEnv('EMAIL_FROM', 'noreply@example.test');
  state.tokens = [];
  state.afterTasks = [];
  state.sendMail.mockResolvedValue({});
  state.limitCheck.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe('resend-verification', () => {
  it('answers identically for unverified, verified, unknown and rate-limited requests', async () => {
    state.user = { id: 'u1', password: 'h', emailVerified: null };
    const unverified = await respond();
    expect(state.sendMail).toHaveBeenCalledTimes(1);
    expect(state.tokens[0]?.identifier).toBe('verify:owner@example.test');

    state.sendMail.mockClear();
    state.user = { id: 'u1', password: 'h', emailVerified: new Date() };
    const verified = await respond();

    state.user = undefined;
    const unknown = await respond();

    state.limitCheck.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    state.user = { id: 'u1', password: 'h', emailVerified: null };
    const limited = await respond();

    for (const other of [verified, unknown, limited]) expect(other).toEqual(unverified);
    expect(state.sendMail).not.toHaveBeenCalled();
  });
});
