/**
 * Server-side currency detection + request-scoped currency locals.
 *
 * Detection priority:
 *   1. ?currency= query parameter
 *   2. "currency" cookie (persisted user preference)
 *   3. "currency" value stored on the session (logged-in users only)
 *   4. USD (fallback, the base currency)
 *
 * A manually chosen currency (cookie / localStorage) always overrides
 * automatic defaults. Display conversion is centralized in utils/currency.js.
 */
const { CURRENCIES, CURRENCY_MAP, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } = require('../config/currencies');
const { getCurrency, formatCurrency, currencySymbol, convertToDisplay } = require('../utils/currency');
const { parseCookies } = require('./i18n');

const CURRENCY_COOKIE = 'currency';

/**
 * Resolve the best supported currency for a request.
 */
function resolveCurrency(req) {
  // 1. Query parameter (?currency=TZS)
  const q = req.query && req.query.currency;
  if (q && SUPPORTED_CURRENCIES.includes(String(q).toUpperCase())) return String(q).toUpperCase();

  // 2. Persisted cookie
  const cookies = parseCookies(req.headers.cookie);
  const cookieCurrency = cookies[CURRENCY_COOKIE];
  if (cookieCurrency && SUPPORTED_CURRENCIES.includes(cookieCurrency)) return cookieCurrency;

  // 3. Session value (only meaningful for logged-in users)
  if (req.session && req.session.currency && SUPPORTED_CURRENCIES.includes(req.session.currency)) {
    return req.session.currency;
  }

  return DEFAULT_CURRENCY;
}

/**
 * Express middleware: resolve currency, expose template locals.
 * Must run after i18nMiddleware (which owns formatDate) but before any
 * controller that renders or formats prices.
 */
function currencyMiddleware(req, res, next) {
  const code = resolveCurrency(req);

  req.currency = code;
  if (req.session && req.session.userId && req.session.currency !== code) {
    req.session.currency = code;
  }

  res.locals.currency = code;
  res.locals.currentCurrency = getCurrency(code);
  res.locals.CURRENCIES = CURRENCIES;
  res.locals.currencySymbol = (c) => currencySymbol(c || code);
  res.locals.convertCurrency = (amount) => convertToDisplay(amount, code);
  res.locals.formatCurrency = (amount) => formatCurrency(amount, code);

  next();
}

module.exports = { currencyMiddleware, resolveCurrency, CURRENCY_COOKIE };
