import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TokenRow = { identifier: string; token: string; expires: Date };

const state = vi.hoisted(() => ({
  user: undefined as undefined | { id: string; email: string },
  tokens: [] as TokenRow[],
  env: { NEXTAUTH_URL: 'https://app.example.test' as string | undefined },
  sendMail: vi.fn(),
  createTransport: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('~/env', () => ({ env: state.env }));

vi.mock('nodemailer', () => ({
  createTransport: state.createTransport,
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({
      column: (column as { name: string }).name,
      value,
    }),
  };
});

vi.mock('~/server/db', () => ({
  db: {
    query: {
      users: { findFirst: state.findFirst },
    },
    delete: () => ({
      where: async (cond: { column: keyof TokenRow; value: unknown }) => {
        state.tokens = state.tokens.filter((row) => row[cond.column] !== cond.value);
      },
    }),
    insert: () => ({
      values: async (row: TokenRow) => {
        state.tokens.push(row);
      },
    }),
  },
}));

import { POST } from './route';

const EMAIL = 'owner@example.test';

function postRequest(body: unknown) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function configureSmtp() {
  vi.stubEnv('SMTP_HOST', 'smtp.example.test');
  vi.stubEnv('EMAIL_FROM', 'Sagelytics <noreply@example.test>');
}

beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: 'user-1', email: EMAIL };
  state.tokens = [];
  state.env.NEXTAUTH_URL = 'https://app.example.test';
  state.findFirst.mockImplementation(async () => state.user);
  state.sendMail.mockResolvedValue({ messageId: 'msg-1' });
  state.createTransport.mockReturnValue({ sendMail: state.sendMail });
  configureSmtp();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('forgot-password', () => {
  it('stores a token, sends the reset link by email, and never logs the token', async () => {
    const logSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
    ];

    const res = await POST(postRequest({ email: EMAIL }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    expect(state.tokens).toHaveLength(1);
    const row = state.tokens[0];
    if (!row) throw new Error('expected a stored reset token');
    expect(row.identifier).toBe(EMAIL);
    expect(row.expires.getTime()).toBeGreaterThan(Date.now() + 50 * 60 * 1000);

    expect(state.sendMail).toHaveBeenCalledTimes(1);
    const sent = state.sendMail.mock.calls[0]?.[0] as { to: string; text: string; html: string };
    expect(sent.to).toBe(EMAIL);
    const link = `https://app.example.test/reset-password?token=${row.token}`;
    expect(sent.text).toContain(link);
    expect(sent.html).toContain(link.replace(/&/g, '&amp;'));

    const logged = logSpies.flatMap((spy) => spy.mock.calls.flat().map(String));
    for (const line of logged) {
      expect(line).not.toContain(row.token);
    }
  });

  it('returns the same success response for an unknown email as for a known one', async () => {
    const known = await POST(postRequest({ email: EMAIL }));
    const knownBody = await known.json();
    expect(state.sendMail).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    state.tokens = [];
    state.user = undefined;
    const unknown = await POST(postRequest({ email: 'nobody@example.test' }));

    expect(unknown.status).toBe(known.status);
    expect(await unknown.json()).toEqual(knownBody);
    expect(state.tokens).toHaveLength(0);
    expect(state.sendMail).not.toHaveBeenCalled();
  });

  it('returns 503 before any user lookup when SMTP is not configured', async () => {
    vi.stubEnv('SMTP_HOST', '');

    const res = await POST(postRequest({ email: EMAIL }));

    expect(res.status).toBe(503);
    expect(state.findFirst).not.toHaveBeenCalled();
    expect(state.createTransport).not.toHaveBeenCalled();
    expect(state.tokens).toHaveLength(0);
  });

  it('returns 503 before any user lookup when NEXTAUTH_URL is missing', async () => {
    state.env.NEXTAUTH_URL = undefined;

    const res = await POST(postRequest({ email: EMAIL }));

    expect(res.status).toBe(503);
    expect(state.findFirst).not.toHaveBeenCalled();
    expect(state.sendMail).not.toHaveBeenCalled();
  });

  it('still returns success when delivery fails, and removes the unsent token', async () => {
    state.sendMail.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(postRequest({ email: EMAIL }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(state.tokens).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      'Password reset email failed to send:',
      'connect ECONNREFUSED',
    );
  });

  it('rejects an invalid email with 400', async () => {
    const res = await POST(postRequest({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(state.findFirst).not.toHaveBeenCalled();
  });
});
