import { describe, expect, it } from 'vitest';
import { toMonitorableUrl } from './product-url';

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
  ])('rejects %s', (value) => {
    expect(toMonitorableUrl(value)).toBeNull();
  });
});
