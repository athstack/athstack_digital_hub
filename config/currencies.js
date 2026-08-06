/**
 * Supported currencies, display metadata and exchange rates.
 *
 * The application stores and prices everything internally in a single base
 * currency (USD). Display amounts are converted at render time using each
 * currency's rate relative to the base, so switching currency never rewrites
 * stored data.
 *
 * Rates can be overridden with environment variables, e.g.:
 *   USD_TO_TZS_RATE=2500
 * Keep the Vercel project environment variables in sync with .env.
 */

const BASE_CURRENCY = 'USD';
const DEFAULT_CURRENCY = 'USD';
const SUPPORTED_CURRENCIES = ['USD', 'TZS'];

function parseRate(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const CURRENCIES = [
  {
    code: 'USD',
    symbol: '$',
    label: 'USD',
    icon: '💵',
    fullName: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
    rate: 1
  },
  {
    code: 'TZS',
    symbol: 'TZS',
    label: 'TZS',
    icon: '💰',
    fullName: 'Tanzanian Shilling',
    locale: 'sw-TZ',
    decimals: 0,
    rate: parseRate(process.env.USD_TO_TZS_RATE, 2500)
  }
];

const CURRENCY_MAP = CURRENCIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {});

module.exports = {
  CURRENCIES,
  CURRENCY_MAP,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  BASE_CURRENCY
};
