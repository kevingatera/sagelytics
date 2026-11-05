/**
 * Extracts a listed price from free text.
 *
 * A number counts as a price only with an explicit cue: a currency symbol or code
 * next to it, or a price word ("price", "from", ...) followed by a price unit or a
 * decimal amount. Bare numbers such as quantities, capacities, versions, years or
 * "24/7" never qualify. Unknown is returned as null, never 0.
 */
const CURRENCY_CODES = 'USD|EUR|GBP|CAD|AUD|NZD|JPY|CHF';
const PRICE_UNITS =
  'night|nights|day|week|month|mo|year|yr|person|pp|hour|hr|unit|each';

// Thousands with commas, dot decimals, comma decimals, or plain integers.
// The lookaheads stop a match from splitting a longer number such as "1.250,00".
const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+,\d{2}|\d+)(?!\d)(?![.,]\d)(?!\s*\/\s*\d)`;

const SYMBOL_PREFIX = new RegExp(String.raw`[$€£¥]\s?${AMOUNT}`);
const CODE_PREFIX = new RegExp(String.raw`\b(?:${CURRENCY_CODES})\s?${AMOUNT}`, 'i');
const CODE_SUFFIX = new RegExp(String.raw`${AMOUNT}\s?\b(?:${CURRENCY_CODES})\b`, 'i');
const CUE_PATTERN = new RegExp(
  String.raw`\b(price|cost|from|starting at|now|only)\s*:?\s*${AMOUNT}` +
    String.raw`(\s*\/\s*(?:${PRICE_UNITS})\b|\s+per\s+(?:${PRICE_UNITS})\b)?`,
  'i',
);

function toAmount(raw: string): number {
  const normalized = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw)
    ? raw.replace(/,/g, '')
    : raw.replace(',', '.');
  return Number(normalized);
}

export function parseListedPrice(text: string): number | null {
  if (!text) return null;

  for (const pattern of [SYMBOL_PREFIX, CODE_PREFIX, CODE_SUFFIX]) {
    const match = pattern.exec(text);
    if (match) {
      const value = toAmount(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }

  const cue = CUE_PATTERN.exec(text);
  if (cue) {
    const [, cueWord, raw, unit] = cue;
    const hasDecimal = /[.,]\d{2}$/.test(raw);
    const explicitPriceWord = /^(price|cost)$/i.test(cueWord);
    if (unit || hasDecimal || explicitPriceWord) {
      const value = toAmount(raw);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}
