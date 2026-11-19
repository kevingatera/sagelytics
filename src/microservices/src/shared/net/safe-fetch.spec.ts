import http from 'http';
import type { AddressInfo } from 'net';
import zlib from 'zlib';
import { hostnameProblem, isPublicAddress, parseIpv6 } from './address-policy';
import {
  assertSafeUrl,
  assertSafeUrlText,
  createSafeFetch,
  isConnectionError,
  nodeTransport,
  pinnedLookup,
  UnsafeUrlError,
  type LookupFn,
  type TransportRequest,
} from './safe-fetch';
import { fakeLookup, pinnedAddress, reply } from './test-support';

const PUBLIC_V4 = '93.184.216.34';
const PUBLIC_V6 = '2606:2800:220:1:248:1893:25c8:1946';

describe('isPublicAddress', () => {
  it.each([
    ['0.0.0.0', '0.0.0.0/8'],
    ['0.255.255.255', '0.0.0.0/8'],
    ['10.0.0.1', '10.0.0.0/8'],
    ['10.255.255.255', '10.0.0.0/8'],
    ['100.64.0.1', '100.64.0.0/10 CGNAT'],
    ['100.127.255.254', '100.64.0.0/10 CGNAT'],
    ['127.0.0.1', '127.0.0.0/8'],
    ['127.255.255.254', '127.0.0.0/8'],
    ['169.254.169.254', '169.254.0.0/16 metadata'],
    ['169.254.0.1', '169.254.0.0/16'],
    ['172.16.0.1', '172.16.0.0/12'],
    ['172.31.255.255', '172.16.0.0/12'],
    ['192.168.0.1', '192.168.0.0/16'],
    ['192.168.255.255', '192.168.0.0/16'],
    ['192.0.0.8', '192.0.0.0/24'],
    ['198.18.0.1', '198.18.0.0/15'],
    ['198.19.255.255', '198.18.0.0/15'],
    ['224.0.0.1', '224.0.0.0/4 multicast'],
    ['239.255.255.250', '224.0.0.0/4 multicast'],
    ['240.0.0.1', '240.0.0.0/4 reserved'],
    ['255.255.255.255', 'broadcast'],
    ['192.0.2.1', 'TEST-NET-1'],
    ['198.51.100.1', 'TEST-NET-2'],
    ['203.0.113.1', 'TEST-NET-3'],
  ])('blocks %s (%s)', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each([
    ['::', 'unspecified'],
    ['::1', 'loopback'],
    ['0:0:0:0:0:0:0:1', 'loopback, long form'],
    ['fc00::1', 'fc00::/7 ULA'],
    ['fd12:3456:789a::1', 'fc00::/7 ULA'],
    ['fe80::1', 'fe80::/10 link-local'],
    ['fe80::1%eth0', 'link-local with zone id'],
    ['febf::1', 'fe80::/10 upper edge'],
    ['fec0::1', 'site-local'],
    ['ff02::1', 'multicast'],
    ['::ffff:127.0.0.1', 'mapped loopback'],
    ['::ffff:7f00:1', 'mapped loopback, hex'],
    ['::ffff:10.0.0.1', 'mapped private'],
    ['::ffff:169.254.169.254', 'mapped metadata'],
    ['::ffff:0:192.168.1.1', 'translated private'],
    ['::127.0.0.1', 'compatible loopback'],
    ['::7f00:1', 'compatible loopback, as URL parsing writes it'],
    ['64:ff9b::127.0.0.1', 'NAT64 loopback'],
    ['64:ff9b::a9fe:a9fe', 'NAT64 metadata'],
    ['64:ff9b::10.1.2.3', 'NAT64 private'],
    ['64:ff9b:1::1', 'local-use NAT64'],
    ['2002:7f00:1::1', '6to4 of loopback'],
    ['2002:c0a8:101::1', '6to4 of private'],
    ['2001::1', 'Teredo'],
    ['2001:db8::1', 'documentation'],
    ['100::1', 'discard'],
    ['[::1]', 'bracketed loopback'],
  ])('blocks %s (%s)', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each([
    PUBLIC_V4,
    '8.8.8.8',
    '1.1.1.1',
    '100.63.255.255',
    '100.128.0.1',
    '172.15.255.255',
    '172.32.0.1',
    '169.253.255.255',
    '198.17.255.255',
    '198.20.0.1',
    '223.255.255.254',
    PUBLIC_V6,
    '2a00:1450:4001:82a::200e',
    '::ffff:8.8.8.8',
    '64:ff9b::8.8.8.8',
    '2002:808:808::1',
  ])('allows public %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });

  it.each(['', 'example.com', '1.2.3', '999.1.1.1', 'gggg::1', ':::'])(
    'treats non-IP %p as not public',
    (value) => {
      expect(isPublicAddress(value)).toBe(false);
    },
  );

  it('expands embedded IPv4 in IPv6', () => {
    expect(parseIpv6('::ffff:127.0.0.1')).toEqual([
      0, 0, 0, 0, 0, 0xffff, 0x7f00, 1,
    ]);
  });
});

describe('hostnameProblem', () => {
  it.each([
    'localhost',
    'LOCALHOST',
    'localhost.',
    'api.localhost',
    'printer.local',
    'metadata.google.internal',
    'router.home.arpa',
    'intranet',
    'metadata',
    '127.0.0.1',
    '[::1]',
    '[::ffff:7f00:1]',
  ])('refuses %s', (host) => {
    expect(hostnameProblem(host)).not.toBeNull();
  });

  it.each(['shop.example.com', 'example.com.', PUBLIC_V4, `[${PUBLIC_V6}]`])(
    'accepts %s',
    (host) => {
      expect(hostnameProblem(host)).toBeNull();
    },
  );
});

describe('assertSafeUrlText', () => {
  it.each([
    ['ftp://example.com/file', 'scheme'],
    ['file:///etc/passwd', 'scheme'],
    ['gopher://example.com/', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['https://user:pass@example.com/', 'credentials'],
    ['https://user@example.com/', 'credentials'],
    ['https://example.com:8080/', 'port'],
    ['http://example.com:22/', 'port'],
    [
      'https://example.com:80/',
      'port is not the scheme default but is allowed',
    ],
    ['http://localhost/', 'host'],
    ['http://127.0.0.1/', 'host'],
    ['http://2130706433/', 'decimal loopback'],
    ['http://0x7f.1/', 'hex loopback'],
    ['http://[::ffff:127.0.0.1]/', 'mapped loopback'],
    ['http://169.254.169.254/latest/meta-data/', 'metadata'],
    ['not a url', 'invalid'],
  ])('handles %s (%s)', (url, reason) => {
    if (reason.includes('allowed')) {
      expect(assertSafeUrlText(url).hostname).toBe('example.com');
      return;
    }
    expect(() => assertSafeUrlText(url)).toThrow(UnsafeUrlError);
  });

  it('allows a non-default port only when the policy names it', () => {
    expect(() => assertSafeUrlText('https://example.com:8443/')).toThrow(
      /port \(8443\)/,
    );
    expect(
      assertSafeUrlText('https://example.com:8443/', {
        allowedPorts: [443, 8443],
      }).port,
    ).toBe('8443');
  });

  it('never echoes credentials in the error', () => {
    expect(() =>
      assertSafeUrlText('https://admin:s3cret@example.com/'),
    ).toThrow(/^(?!.*s3cret).*$/);
  });
});

describe('assertSafeUrl', () => {
  it('accepts a host whose every address is public', async () => {
    const result = await assertSafeUrl('https://shop.example/p', {
      lookup: fakeLookup({ 'shop.example': [PUBLIC_V4, PUBLIC_V6] }),
    });
    expect(result.addresses.map((a) => a.address)).toEqual([
      PUBLIC_V4,
      PUBLIC_V6,
    ]);
  });

  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '169.254.169.254',
    '100.64.1.1',
    '::1',
    'fd00::5',
    '::ffff:192.168.0.10',
  ])('refuses a public name that resolves to %s', async (address) => {
    await expect(
      assertSafeUrl('https://evil.example/', {
        lookup: fakeLookup({ 'evil.example': address }),
      }),
    ).rejects.toThrow(/resolves to a non-public address/);
  });

  it('refuses when any one of several answers is private', async () => {
    await expect(
      assertSafeUrl('https://mixed.example/', {
        lookup: fakeLookup({ 'mixed.example': [PUBLIC_V4, '127.0.0.1'] }),
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('does not look up a refused literal', async () => {
    const lookup = jest.fn<ReturnType<LookupFn>, Parameters<LookupFn>>();
    await expect(
      assertSafeUrl('http://127.0.0.1/', { lookup }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('createSafeFetch', () => {
  function setup(
    table: Record<string, string | string[]>,
    respond: (request: TransportRequest) => ReturnType<typeof reply>,
  ) {
    const lookup = jest.fn(fakeLookup(table));
    const transport = jest.fn((request: TransportRequest) =>
      Promise.resolve(respond(request)),
    );
    return { lookup, transport, fetch: createSafeFetch({ lookup, transport }) };
  }

  it('fetches a public host and pins the socket to the vetted address', async () => {
    const { fetch, transport } = setup({ 'shop.example': PUBLIC_V4 }, () =>
      reply(200, '<html>ok</html>'),
    );

    const response = await fetch('https://shop.example/p');

    expect(response.ok).toBe(true);
    expect(await response.text()).toBe('<html>ok</html>');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(await pinnedAddress(transport.mock.calls[0][0])).toBe(PUBLIC_V4);
  });

  it('refuses a host resolving to 127.0.0.1 without sending a request', async () => {
    const { fetch, transport } = setup({ 'evil.example': '127.0.0.1' }, () =>
      reply(200),
    );

    await expect(fetch('https://evil.example/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it('follows a redirect to another public host and re-checks it', async () => {
    const { fetch, lookup, transport } = setup(
      { 'a.example': PUBLIC_V4, 'b.example': PUBLIC_V6 },
      (request) =>
        request.url.hostname === 'a.example'
          ? reply(301, '', { location: 'https://b.example/final' })
          : reply(200, 'final'),
    );

    const response = await fetch('https://a.example/start');

    expect(response.url).toBe('https://b.example/final');
    expect(response.redirected).toBe(true);
    expect(lookup).toHaveBeenCalledWith('b.example');
    expect(await pinnedAddress(transport.mock.calls[1][0])).toBe(PUBLIC_V6);
  });

  it.each([
    ['a private literal', 'http://169.254.169.254/latest/meta-data/'],
    ['localhost', 'http://localhost/admin'],
    ['a disallowed port', 'https://a.example:6379/'],
    ['a disallowed scheme', 'file:///etc/passwd'],
    ['a name resolving to loopback', 'https://internal.example/'],
  ])('blocks a redirect to %s', async (_label, location) => {
    const { fetch, transport } = setup(
      { 'a.example': PUBLIC_V4, 'internal.example': '127.0.0.1' },
      () => reply(302, '', { location }),
    );

    await expect(fetch('https://a.example/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('resolves relative redirects against the current URL', async () => {
    const { fetch, transport } = setup({ 'a.example': PUBLIC_V4 }, (request) =>
      request.url.pathname === '/old'
        ? reply(308, '', { location: '/new' })
        : reply(200, 'moved'),
    );

    const response = await fetch('https://a.example/old');

    expect(response.url).toBe('https://a.example/new');
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('stops after 5 redirects', async () => {
    let hop = 0;
    const { fetch, transport } = setup({ 'a.example': PUBLIC_V4 }, () =>
      reply(302, '', { location: `/hop-${++hop}` }),
    );

    await expect(fetch('https://a.example/')).rejects.toThrow(
      /Too many redirects/,
    );
    expect(transport).toHaveBeenCalledTimes(6);
  });

  it('drops cookies and authorization on a cross-origin redirect', async () => {
    const { fetch, transport } = setup(
      { 'a.example': PUBLIC_V4, 'b.example': PUBLIC_V4 },
      (request) =>
        request.url.hostname === 'a.example'
          ? reply(302, '', { location: 'https://b.example/' })
          : reply(200),
    );

    await fetch('https://a.example/', {
      headers: {
        Cookie: 'sid=1',
        Authorization: 'Bearer x',
        'User-Agent': 'ua',
      },
    });

    const second = transport.mock.calls[1][0].headers;
    expect(second.Cookie).toBeUndefined();
    expect(second.Authorization).toBeUndefined();
    expect(second['User-Agent']).toBe('ua');
  });

  describe('DNS rebinding', () => {
    it('connects to the first, vetted answer even if DNS later answers private', async () => {
      const answers = [PUBLIC_V4, '127.0.0.1'];
      const lookup = jest.fn(() =>
        Promise.resolve([
          { address: answers.shift() ?? '127.0.0.1', family: 4 },
        ]),
      );
      const transport = jest.fn((request: TransportRequest) =>
        Promise.resolve(reply(200, request.url.hostname)),
      );
      const fetch = createSafeFetch({ lookup, transport });

      await fetch('https://rebind.example/');

      // The connection's lookup is pinned: asking it again cannot return the private answer.
      const request = transport.mock.calls[0][0];
      expect(await pinnedAddress(request)).toBe(PUBLIC_V4);
      expect(await pinnedAddress(request)).toBe(PUBLIC_V4);
      expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('blocks a same-host redirect once DNS flips to a private address', async () => {
      const answers = [PUBLIC_V4, '127.0.0.1'];
      const lookup = jest.fn(() =>
        Promise.resolve([
          { address: answers.shift() ?? '127.0.0.1', family: 4 },
        ]),
      );
      const transport = jest.fn(() =>
        Promise.resolve(reply(302, '', { location: '/again' })),
      );
      const fetch = createSafeFetch({ lookup, transport });

      await expect(fetch('https://rebind.example/')).rejects.toThrow(
        /non-public address \(127\.0\.0\.1\)/,
      );
      expect(transport).toHaveBeenCalledTimes(1);
    });
  });

  it('aborts when the caller signal fires', async () => {
    const controller = new AbortController();
    const transport = jest.fn(
      (request: TransportRequest) =>
        new Promise<ReturnType<typeof reply>>((_, reject) => {
          request.signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const fetch = createSafeFetch({
      lookup: fakeLookup({ 'slow.example': PUBLIC_V4 }),
      transport,
    });

    const pending = fetch('https://slow.example/', {
      signal: controller.signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it('rejects at once when the caller signal already fired', async () => {
    const transport = jest.fn();
    const fetch = createSafeFetch({
      lookup: fakeLookup({ 'a.example': PUBLIC_V4 }),
      transport,
    });

    await expect(
      fetch('https://a.example/', { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport).not.toHaveBeenCalled();
  });
});

describe('pinnedLookup', () => {
  const lookup = pinnedLookup([
    { address: PUBLIC_V4, family: 4 },
    { address: PUBLIC_V6, family: 6 },
  ]);

  it('answers single and all-address lookups from the vetted list', (done) => {
    lookup('any.example', {}, (error, address, family) => {
      expect(error).toBeNull();
      expect(address).toBe(PUBLIC_V4);
      expect(family).toBe(4);
      lookup('any.example', { all: true, family: 6 }, (_e, all) => {
        expect(all).toEqual([{ address: PUBLIC_V6, family: 6 }]);
        done();
      });
    });
  });
});

describe('isConnectionError', () => {
  it.each([
    'ECONNREFUSED',
    'ECONNRESET',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'EPROTO',
  ])('treats %s as a connection failure', (code) => {
    expect(isConnectionError(Object.assign(new Error(code), { code }))).toBe(
      true,
    );
  });

  it.each([
    new Error('ACCESS_DENIED'),
    Object.assign(new Error('timeout'), { name: 'AbortError' }),
    Object.assign(new Error('dns'), { code: 'ENOTFOUND' }),
    new UnsafeUrlError('http://127.0.0.1/', 'private'),
  ])('does not treat %p as a connection failure', (error) => {
    expect(isConnectionError(error)).toBe(false);
  });
});

// nodeTransport against a loopback server: proves the socket uses the pinned lookup, not DNS.
// The address check is relaxed for this one test because the test server is on 127.0.0.1.
describe('nodeTransport', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/gzip') {
        res.writeHead(200, { 'content-encoding': 'gzip' });
        res.end(zlib.gzipSync('compressed body'));
        return;
      }
      if (req.url === '/big') {
        res.end('x'.repeat(2048));
        return;
      }
      res.end(`host=${req.headers.host}`);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function loopbackFetch() {
    return createSafeFetch({
      lookup: fakeLookup({ 'pinned.test': '127.0.0.1' }),
      isAllowedAddress: (address) => address === '127.0.0.1',
    });
  }

  it('connects through the pinned address and keeps the original Host header', async () => {
    const response = await loopbackFetch()(`http://pinned.test:${port}/`, {
      allowedPorts: [port],
    });
    expect(await response.text()).toBe(`host=pinned.test:${port}`);
  });

  it('decodes gzip bodies', async () => {
    const response = await loopbackFetch()(`http://pinned.test:${port}/gzip`, {
      allowedPorts: [port],
    });
    expect(await response.text()).toBe('compressed body');
  });

  it('caps the response body size', async () => {
    await expect(
      loopbackFetch()(`http://pinned.test:${port}/big`, {
        allowedPorts: [port],
        maxBodyBytes: 1024,
      }),
    ).rejects.toThrow(/too large/);
  });

  it('refuses the same loopback server under the default address policy', async () => {
    const strict = createSafeFetch({
      lookup: fakeLookup({ 'pinned.test': '127.0.0.1' }),
      transport: nodeTransport,
    });
    await expect(
      strict(`http://pinned.test:${port}/`, { allowedPorts: [port] }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
