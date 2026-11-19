import {
  PRICE_HEARTBEAT_MS,
  calculatePriceChange,
  shouldRecordPrice,
  toStoredChange,
} from './price-history';

const NOW = new Date('2026-11-18T12:00:00Z');

describe('price history recording rules', () => {
  it('records the first observation for a product', () => {
    expect(shouldRecordPrice(null, 49, NOW)).toBe(true);
  });

  it('records when the price changed since the last row', () => {
    expect(
      shouldRecordPrice({ price: 40, recordedAt: new Date(NOW.getTime() - 60_000) }, 41, NOW),
    ).toBe(true);
  });

  it('does not record an unchanged price within the heartbeat window', () => {
    expect(
      shouldRecordPrice({ price: 40, recordedAt: new Date(NOW.getTime() - 60_000) }, 40, NOW),
    ).toBe(false);
  });

  it('records an unchanged price once the heartbeat window has passed', () => {
    expect(
      shouldRecordPrice(
        { price: 40, recordedAt: new Date(NOW.getTime() - PRICE_HEARTBEAT_MS) },
        40,
        NOW,
      ),
    ).toBe(true);
  });

  it('treats a previous row without a usable price as a reason to record', () => {
    expect(shouldRecordPrice({ price: null, recordedAt: NOW }, 40, NOW)).toBe(true);
  });
});

describe('price change math', () => {
  it('computes percentage change against the previous price', () => {
    expect(calculatePriceChange(40, 49)).toBeCloseTo(22.5, 5);
    expect(calculatePriceChange(40, 30)).toBeCloseTo(-25, 5);
  });

  it('has no change without a previous price', () => {
    expect(calculatePriceChange(null, 49)).toBeNull();
    expect(calculatePriceChange(0, 49)).toBeNull();
  });

  it('rounds stored changes to two decimals', () => {
    expect(toStoredChange(22.4567)).toBe(22.46);
  });

  it('stores null for changes that do not fit numeric(5, 2)', () => {
    expect(toStoredChange(1000)).toBeNull();
    expect(toStoredChange(-1500)).toBeNull();
    expect(toStoredChange(null)).toBeNull();
    expect(toStoredChange(Number.NaN)).toBeNull();
  });
});
