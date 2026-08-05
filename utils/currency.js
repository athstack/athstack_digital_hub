/**
 * Centralized currency conversion + formatting.
 *
 * All stored prices are in the base currency (USD). Use convertToDisplay /
 * formatCurrency whenever a price is shown, and convertToBase when a user
 * enters an amount in their display currency (e.g. the shop price filter).
 */
const { CURRENCY_MAP, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } = require('../config/currencies');

function getCurrency(code) {
  return CURRENCY_MAP[code] || CURRENCY_MAP[DEFAULT_CURRENCY];
}

function isSupportedCurrency(code) {
  return SUPPORTED_CURRENCIES.includes(code);
}

function getRate(code) {
  return getCurrency(code).rate;
}

/**
 * Convert a base-currency amount to its display value in the given currency.
 * @param {number} amountBase - Amount stored in base currency (USD)
 * @param {string} code - Currency code (USD | TZS)
 * @returns {number}
 */
function convertToDisplay(amountBase, code) {
  const conf = getCurrency(code);
  const value = amountBase === null || amountBase === undefined ? 0 : Number(amountBase);
  if (!Number.isFinite(value)) return 0;
  const converted = value * conf.rate;
  const factor = Math.pow(10, conf.decimals);
  return Math.round((converted + Number.EPSILON) * factor) / factor;
}

/**
 * Convert a display-currency amount back to base currency (USD).
 * @param {number} amountDisplay - Amount in the user's display currency
 * @param {string} code - Currency code (USD | TZS)
 * @returns {number}
 */
function convertToBase(amountDisplay, code) {
  const conf = getCurrency(code);
  const value = amountDisplay === null || amountDisplay === undefined ? 0 : Number(amountDisplay);
  if (!Number.isFinite(value)) return 0;
  if (!conf.rate) return value;
  return Math.round((value / conf.rate + Number.EPSILON) * 100) / 100;
}

/**
 * Locale-aware formatter for a base-currency amount in the given currency.
 *   USD: $1,234.56        TZS: TZS 3,086,400
 * @param {number} amountBase - Amount stored in base currency (USD)
 * @param {string} [code] - Currency code (defaults to app default)
 * @returns {string}
 */
function formatCurrency(amountBase, code) {
  const conf = getCurrency(code);
  const display = convertToDisplay(amountBase, conf.code);
  try {
    if (conf.code === 'TZS') {
      return new Intl.NumberFormat(conf.locale, {
        style: 'currency',
        currency: 'TZS',
        currencyDisplay: 'code',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(display);
    }
    return new Intl.NumberFormat(conf.locale, {
      style: 'currency',
      currency: conf.code,
      minimumFractionDigits: conf.decimals,
      maximumFractionDigits: conf.decimals
    }).format(display);
  } catch (e) {
    return conf.symbol + display.toFixed(conf.decimals);
  }
}

/**
 * @param {string} code
 * @returns {string} Display symbol for the currency ('$' or 'TZS')
 */
function currencySymbol(code) {
  return getCurrency(code).symbol;
}

module.exports = {
  getCurrency,
  isSupportedCurrency,
  getRate,
  convertToDisplay,
  convertToBase,
  formatCurrency,
  currencySymbol
};
