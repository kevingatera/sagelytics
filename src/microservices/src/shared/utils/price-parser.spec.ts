import { parseListedPrice } from './price-parser';

describe('parseListedPrice', () => {
  it.each([
    ['$49', 49],
    ['€12.50', 12.5],
    ['USD 1,200', 1200],
    ['1,200 USD', 1200],
    ['from 99/night', 99],
    ['Price: 49.99', 49.99],
  ])('reads an explicit price from %j', (text, expected) => {
    expect(parseListedPrice(text)).toBe(expected);
  });

  it.each([
    'Room for 2 guests',
    '24/7 Support',
    'Plan 2026',
    'Version 2.5 release',
    'Includes 3 nights',
    'from 2 guests',
    'Sold 1,200 units',
    'Free shipping',
    '',
  ])('returns null (unknown, not 0) for %j', (text) => {
    expect(parseListedPrice(text)).toBeNull();
  });
});
