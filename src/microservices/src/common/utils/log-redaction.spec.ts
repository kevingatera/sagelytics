import { catalogHostForLog, maskRedisUrl, urlForLog } from './log-redaction';

describe('urlForLog', () => {
  it('keeps scheme, host and path; drops userinfo, query and fragment', () => {
    expect(urlForLog('https://u:p@shop.example:8443/feed.xml?sig=abc&token=t#x')).toBe(
      'https://shop.example:8443/feed.xml',
    );
  });

  it('handles a bare domain', () => {
    expect(urlForLog('shop.example/catalog?key=k')).toBe('https://shop.example/catalog');
  });

  it('strips query and userinfo from unparseable input', () => {
    const out = urlForLog('http://u:pw@bad host/x?key=k');
    expect(out).not.toContain('pw');
    expect(out).not.toContain('key=k');
  });

  it('does not dump non-string input', () => {
    expect(urlForLog({ loc: 'https://x.example/?t=1' })).toBe('[non-string url]');
    expect(urlForLog(undefined)).toBe('undefined');
  });
});

describe('maskRedisUrl', () => {
  it.each([
    ['redis://user:pass@cache.example:6379/0', 'redis://***@cache.example:6379/0'],
    ['redis://:pass@cache.example:6379', 'redis://***@cache.example:6379'],
    ['redis://:pass@cache.example', 'redis://***@cache.example'],
    ['redis://default@cache.example:6379', 'redis://***@cache.example:6379'],
    ['rediss://u:p%40ss@cache.example:6380/2?tls=true&password=x', 'rediss://***@cache.example:6380/2'],
    ['redis://cache.example:6379/1#frag', 'redis://cache.example:6379/1'],
    ['redis://localhost:6379', 'redis://localhost:6379'],
  ])('masks %s', (input, expected) => {
    expect(maskRedisUrl(input)).toBe(expected);
  });

  it('never prints the secret, even for a password containing @ or :', () => {
    const masked = maskRedisUrl('redis://:s3cr@t:x@cache.example:6379?token=t0k');
    expect(masked).not.toContain('s3cr');
    expect(masked).not.toContain('t0k');
    expect(masked).toContain('cache.example');
  });

  it('masks unparseable input without leaking userinfo or query', () => {
    const masked = maskRedisUrl('redis://:pa ss@bad host?key=k');
    expect(masked).not.toContain('pa ss');
    expect(masked).not.toContain('key=k');
  });

  it('returns an empty string for no URL', () => {
    expect(maskRedisUrl(undefined)).toBe('');
    expect(maskRedisUrl('')).toBe('');
  });
});

describe('catalogHostForLog', () => {
  it('keeps the host only', () => {
    expect(
      catalogHostForLog('https://user:pw@Shop.Example:8443/private/catalog?sig=abc#x'),
    ).toBe('shop.example');
  });

  it('handles a bare host and empty input', () => {
    expect(catalogHostForLog('shop.example/catalog?token=t')).toBe('shop.example');
    expect(catalogHostForLog('')).toBeNull();
    expect(catalogHostForLog(null)).toBeNull();
  });

  it('does not echo an unparseable value', () => {
    expect(catalogHostForLog('http://bad host/?sig=abc')).toBe('[invalid url]');
  });
});
