import { describe, expect, it } from 'vitest';
import { catalogHostForLog } from './log-redaction';

describe('catalogHostForLog', () => {
  it('keeps the host only', () => {
    expect(catalogHostForLog('https://user:pw@Shop.Example:8443/private/catalog?sig=abc#x')).toBe(
      'shop.example',
    );
  });

  it('handles a bare host and empty input', () => {
    expect(catalogHostForLog('shop.example/catalog?token=t')).toBe('shop.example');
    expect(catalogHostForLog('')).toBeNull();
    expect(catalogHostForLog(undefined)).toBeNull();
  });

  it('does not echo an unparseable value', () => {
    expect(catalogHostForLog('http://bad host/?sig=abc')).toBe('[invalid url]');
  });
});
