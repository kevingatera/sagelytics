import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ioredis', () => ({ Redis: class {} }));
// The real class lives in @auth/core, which imports next/server; a stand-in is enough here.
vi.mock('next-auth', () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = 'credentials';
  },
}));

import {
  EmailNotVerifiedError,
  TooManyAttemptsError,
  authorizeCredentials,
  type CredentialUser,
} from './credentials';

const PASSWORD = 'correct horse';

function makeUser(overrides: Partial<CredentialUser> = {}): CredentialUser {
  return {
    id: 'user-1',
    email: 'owner@example.test',
    name: 'Owner',
    image: null,
    password: 'hash-of-correct-horse',
    emailVerified: new Date('2026-01-01T00:00:00Z'),
    onboardingCompleted: false,
    sessionVersion: 3,
    ...overrides,
  };
}

const compare = vi.fn(async (password: string, hash: string) =>
  hash === 'hash-of-correct-horse' && password === PASSWORD,
);
const allow = { check: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('authorizeCredentials', () => {
  it('signs in a verified user and carries the session version', async () => {
    const findUserByEmail = vi.fn(async () => makeUser());
    const user = await authorizeCredentials(
      { email: '  Owner@Example.TEST ', password: PASSWORD },
      undefined,
      { findUserByEmail, limiter: allow, compare },
    );
    expect(user).toMatchObject({ id: 'user-1', sessionVersion: 3 });
    expect(findUserByEmail).toHaveBeenCalledWith('owner@example.test');
  });

  it('refuses an unverified user with the correct password, with a distinct code', async () => {
    const attempt = authorizeCredentials(
      { email: 'owner@example.test', password: PASSWORD },
      undefined,
      { findUserByEmail: async () => makeUser({ emailVerified: null }), limiter: allow, compare },
    );
    await expect(attempt).rejects.toBeInstanceOf(EmailNotVerifiedError);
    await attempt.catch((error: EmailNotVerifiedError) => expect(error.code).toBe('email_unverified'));
  });

  it('gives an unverified account with a wrong password the same answer as an unknown account', async () => {
    const wrong = await authorizeCredentials(
      { email: 'owner@example.test', password: 'wrong' },
      undefined,
      { findUserByEmail: async () => makeUser({ emailVerified: null }), limiter: allow, compare },
    );
    const unknown = await authorizeCredentials(
      { email: 'nobody@example.test', password: 'wrong' },
      undefined,
      { findUserByEmail: async () => undefined, limiter: allow, compare },
    );
    expect(wrong).toBeNull();
    expect(unknown).toBeNull();
    // A bcrypt compare runs even for unknown accounts, so timing does not reveal them.
    expect(compare).toHaveBeenCalledTimes(2);
  });

  it('stops before the password check when rate limited', async () => {
    const findUserByEmail = vi.fn(async () => makeUser());
    const deny = { check: vi.fn(async () => ({ allowed: false, retryAfterSeconds: 60 })) };
    await expect(
      authorizeCredentials(
        { email: 'owner@example.test', password: PASSWORD },
        new Request('http://localhost/api/auth/callback/credentials'),
        { findUserByEmail, limiter: deny, compare },
      ),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it('rate limits on the normalized email', async () => {
    await authorizeCredentials(
      { email: 'Owner@Example.test', password: PASSWORD },
      undefined,
      { findUserByEmail: async () => makeUser(), limiter: allow, compare },
    );
    const rules = (allow.check.mock.calls[0] as unknown as [Array<{ key: string }>])[0];
    expect(rules.map((rule) => rule.key)).toContain('signin:ip-email:unknown:owner@example.test');
  });
});
