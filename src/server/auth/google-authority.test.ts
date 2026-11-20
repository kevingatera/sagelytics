import { describe, expect, it } from 'vitest';

import { googleControlsEmail, idTokenEmail } from './google-authority';

describe('googleControlsEmail', () => {
  it('trusts Gmail addresses, ignoring case and hd', () => {
    expect(googleControlsEmail('someone@gmail.com', undefined)).toBe(true);
    expect(googleControlsEmail('Someone@GoogleMail.COM', undefined)).toBe(true);
    expect(googleControlsEmail('someone@gmail.com', 'other.test')).toBe(true);
  });

  it('trusts a Workspace address whose hd claim is its domain, ignoring case', () => {
    expect(googleControlsEmail('a@example.test', 'example.test')).toBe(true);
    expect(googleControlsEmail('a@Example.TEST', 'EXAMPLE.test')).toBe(true);
  });

  it('does not trust other addresses', () => {
    expect(googleControlsEmail('a@example.test', undefined)).toBe(false);
    expect(googleControlsEmail('a@example.test', 'other.test')).toBe(false);
    // A subdomain is a different domain.
    expect(googleControlsEmail('a@mail.example.test', 'example.test')).toBe(false);
    expect(googleControlsEmail('a@example.test', 'mail.example.test')).toBe(false);
    expect(googleControlsEmail('a@example.test', 42)).toBe(false);
    expect(googleControlsEmail('a@gmail.com.evil.test', undefined)).toBe(false);
    expect(googleControlsEmail('a@notgmail.com', undefined)).toBe(false);
  });

  it('does not trust a missing or malformed address', () => {
    expect(googleControlsEmail(undefined, 'example.test')).toBe(false);
    expect(googleControlsEmail(null, undefined)).toBe(false);
    expect(googleControlsEmail('no-at-sign', 'no-at-sign')).toBe(false);
    expect(googleControlsEmail('a@', '')).toBe(false);
  });
});

describe('idTokenEmail', () => {
  const idToken = (claims: object) =>
    `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

  it('reads hd when present', () => {
    expect(idTokenEmail(idToken({ email: 'a@example.test', email_verified: true, hd: 'example.test' }))).toEqual({
      email: 'a@example.test',
      email_verified: true,
      hd: 'example.test',
    });
  });
});
