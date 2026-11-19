/**
 * Pure rules for sg_price_history rows. No Nest or DB imports, so they stay unit-testable.
 */

/** A price is re-recorded at least this often even when unchanged, so charts keep a heartbeat. */
export const PRICE_HEARTBEAT_MS = 24 * 60 * 60 * 1000;

/** sg_price_history.change_percentage is numeric(5, 2). */
const MAX_STORED_CHANGE = 999.99;

export interface PriceObservation {
  price: number | null;
  recordedAt: Date;
}

export function shouldRecordPrice(
  latest: PriceObservation | null,
  observedPrice: number,
  now: Date,
): boolean {
  if (!latest || latest.price === null || !Number.isFinite(latest.price)) {
    return true;
  }
  if (!isSamePrice(latest.price, observedPrice)) {
    return true;
  }
  return now.getTime() - latest.recordedAt.getTime() >= PRICE_HEARTBEAT_MS;
}

export function calculatePriceChange(
  previousPrice: number | null,
  currentPrice: number | null,
): number | null {
  if (!previousPrice || !currentPrice) return null;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

/**
 * Rounds a change for storage. Values outside numeric(5, 2) are stored as null
 * rather than failing the insert or being clamped into a false value.
 */
export function toStoredChange(change: number | null): number | null {
  if (change === null || !Number.isFinite(change)) return null;
  if (Math.abs(change) > MAX_STORED_CHANGE) return null;
  return Math.round(change * 100) / 100;
}

function isSamePrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}
