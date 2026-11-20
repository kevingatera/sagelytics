import { describe, expect, it } from 'vitest';
import type { Session } from 'next-auth';

import { checkWriteSession } from './write-session';

function session(overrides: Partial<Session> = {}): Session {
  return {
    user: { id: 'u1', email: 'a@example.test', onboardingCompleted: true, sessionVersion: 2 },
    expires: '2099-01-01T00:00:00.000Z',
    sessionVerified: true,
    ...overrides,
  };
}

describe('checkWriteSession', () => {
  it('passes a verified session through', () => {
    const result = checkWriteSession(session());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.user.id).toBe('u1');
  });

  it('answers 401 when signed out', async () => {
    const result = checkWriteSession(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({ error: 'Unauthorized' });
    }
  });

  it('answers 401 for a session without a user id', () => {
    const result = checkWriteSession({ expires: '2099-01-01T00:00:00.000Z' } as Session);
    expect(!result.ok && result.response.status).toBe(401);
  });

  it('answers 503 when the session version could not be confirmed', () => {
    const result = checkWriteSession(session({ sessionVerified: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
      expect(result.response.headers.get('Retry-After')).toBe('5');
    }
  });
});
