import { describe, expect, it } from 'vitest';
import { monitorableEntries, toMonitorableUrl } from './product-url';

describe('toMonitorableUrl', () => {
  it('accepts public http and https pages', () => {
    expect(toMonitorableUrl('https://competitor.example/products/pro')).toBe(
      'https://competitor.example/products/pro',
    );
    expect(toMonitorableUrl('  http://shop.competitor.example/p?id=1  ')).toBe(
      'http://shop.competitor.example/p?id=1',
    );
  });

  it.each([
    '',
    'not a url',
    'competitor.example/products/pro',
    'ftp://competitor.example/file',
    'javascript:alert(1)',
    'https://user:pass@competitor.example/p',
    'http://localhost:3000/p',
    'http://intranet/p',
    'http://printer.local/p',
    'http://127.0.0.1/p',
    'http://10.0.0.5/p',
    'http://172.16.0.1/p',
    'http://192.168.1.1/p',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/p',
    'http://192.0.0.8/p',
    'http://198.18.0.1/p',
    'http://224.0.0.1/p',
    'http://255.255.255.255/p',
    'http://2130706433/p',
    'http://0x7f.1/p',
    'http://[::ffff:127.0.0.1]/p',
    'http://[::127.0.0.1]/p',
    'http://[64:ff9b::a9fe:a9fe]/p',
    'http://[fe80::1]/p',
    'http://[febf::1]/p',
    'http://[fd12:3456::1]/p',
    'http://[ff02::1]/p',
  ])('rejects %s', (value) => {
    expect(toMonitorableUrl(value)).toBeNull();
  });

  it.each(['http://8.8.8.8/p', 'http://198.20.0.1/p', 'http://[2606:4700::1111]/p'])(
    'accepts public literal %s',
    (value) => {
      expect(toMonitorableUrl(value)).toBe(value);
    },
  );
});

describe('monitorableEntries', () => {
  it('keeps public entries, normalized, and drops the rest', () => {
    expect(
      monitorableEntries([
        { id: 'a', name: 'Pro', url: ' https://competitor.example/pro ' },
        { id: 'b', name: 'Meta', url: 'http://169.254.169.254/latest/meta-data' },
        { id: 'c', name: 'Local', url: 'http://localhost:3000/p' },
        { id: 'd', name: 'None', url: undefined },
      ]),
    ).toEqual([{ id: 'a', name: 'Pro', url: 'https://competitor.example/pro' }]);
  });

  it('returns an empty list for undefined', () => {
    expect(monitorableEntries(undefined)).toEqual([]);
  });
});
