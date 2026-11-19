import { beforeEach, describe, expect, it, vi } from 'vitest';

type UserRow = { id: string; email: string; password: string; emailVerified: Date | null };
type TokenRow = { identifier: string; token: string; expires: Date };

const state = vi.hoisted(() => ({
  users: [] as Array<{ id: string; email: string; password: string; emailVerified: Date | null }>,
  tokens: [] as Array<{ identifier: string; token: string; expires: Date }>,
  env: { NEXTAUTH_URL: 'https://app.example.test' as string | undefined },
  sendMail: vi.fn(),
  afterTasks: [] as Array<() => unknown>,
  limitCheck: vi.fn(),
}));

vi.mock('~/env', () => ({ env: state.env }));
vi.mock('next/server', () => ({
  after: (task: () => unknown) => {
    state.afterTasks.push(task);
  },
}));
vi.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: state.sendMail }) }));
vi.mock('bcryptjs', () => ({ hash: async (value: string) => `hashed:${value}` }));
vi.mock('~/server/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getRateLimiter: () => ({ check: state.limitCheck }) };
});

// The route matches users with a lower(email) SQL fragment; resolve it against the
// normalized email that the route passes as the fragment's parameter.
function emailFromCondition(cond: unknown): string | undefined {
  const chunks = (cond as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks.find((chunk): chunk is string => typeof chunk === 'string');
}

vi.mock('~/server/db', () => ({
  db: {
    query: {
      users: {
        findFirst: async ({ where }: { where: unknown }) =>
          state.users.find((u) => u.email.toLowerCase() === emailFromCondition(where)),
      },
    },
    insert: () => ({
      values: (row: UserRow | TokenRow) => {
        if ('token' in row) {
          state.tokens.push(row);
          return Promise.resolve();
        }
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
              if (state.users.some((u) => u.email === row.email)) return [];
              const created = { ...row, id: `user-${state.users.length + 1}` };
              state.users.push(created);
              return [{ id: created.id }];
            },
          }),
        };
      },
    }),
    delete: () => ({ where: async () => undefined }),
  },
}));

import { POST } from './route';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function runAfterTasks() {
  for (const task of state.afterTasks.splice(0)) await task();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('SMTP_HOST', 'smtp.example.test');
  vi.stubEnv('EMAIL_FROM', 'Sagelytics <noreply@example.test>');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  state.users = [];
  state.tokens = [];
  state.afterTasks = [];
  state.env.NEXTAUTH_URL = 'https://app.example.test';
  state.sendMail.mockResolvedValue({ messageId: 'm1' });
  state.limitCheck.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe('register', () => {
  it('creates an unverified account with a normalized email and emails a verification link', async () => {
    const res = await POST(postRequest({ email: ' New@Example.TEST ', name: 'New', password: 'password123' }));

    expect(res.status).toBe(200);
    expect(state.users).toEqual([
      expect.objectContaining({ email: 'new@example.test', emailVerified: null, password: 'hashed:password123' }),
    ]);
    await runAfterTasks();
    expect(state.tokens[0]?.identifier).toBe('verify:new@example.test');
    const sent = state.sendMail.mock.calls[0]?.[0] as { to: string; text: string };
    expect(sent.to).toBe('new@example.test');
    expect(sent.text).toMatch(/https:\/\/app\.example\.test\/verify-email\?token=[A-Za-z0-9_-]{43}/);
  });

  it('returns the same response for an existing email and changes nothing', async () => {
    const fresh = await POST(postRequest({ email: 'a@example.test', name: 'A', password: 'password123' }));
    const freshBody: unknown = await fresh.json();
    await runAfterTasks();
    state.sendMail.mockClear();
    state.tokens = [];

    const again = await POST(postRequest({ email: 'A@example.test', name: 'Squatter', password: 'different99' }));

    expect(again.status).toBe(fresh.status);
    expect(await again.json()).toEqual(freshBody);
    expect(state.users).toHaveLength(1);
    expect(state.users[0]?.password).toBe('hashed:password123');

    await runAfterTasks();
    // The owner gets a note instead of a verification link.
    expect(state.tokens).toHaveLength(0);
    const sent = state.sendMail.mock.calls[0]?.[0] as { subject: string };
    expect(sent.subject).toBe('You already have a Sagelytics account');
  });

  it('still answers 200 when SMTP is not configured, and reports that email is disabled', async () => {
    vi.stubEnv('SMTP_HOST', '');
    const res = await POST(postRequest({ email: 'b@example.test', name: 'B', password: 'password123' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, emailDelivery: 'disabled' });
    expect(state.afterTasks).toHaveLength(0);
  });

  it('returns 429 with Retry-After when rate limited, before touching the database', async () => {
    state.limitCheck.mockResolvedValue({ allowed: false, retryAfterSeconds: 1800 });
    const res = await POST(postRequest({ email: 'c@example.test', name: 'C', password: 'password123' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('1800');
    expect(state.users).toHaveLength(0);
  });

  it('rate limits by the normalized email', async () => {
    await POST(postRequest({ email: 'Mixed@Example.test', name: 'M', password: 'password123' }));
    const rules = state.limitCheck.mock.calls[0]?.[0] as Array<{ key: string }>;
    expect(rules.map((r) => r.key)).toContain('register:email:mixed@example.test');
  });

  it('keeps validation 400s', async () => {
    expect((await POST(postRequest({ email: 'bad', name: 'X', password: 'password123' }))).status).toBe(400);
    expect((await POST(postRequest({ email: 'd@example.test', name: 'X', password: 'short' }))).status).toBe(400);
    expect(state.limitCheck).not.toHaveBeenCalled();
  });
});
