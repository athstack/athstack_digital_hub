/**
 * Currency switching endpoint.
 *
 * GET /set-currency?currency=TZS&redirect=/shop/some-product
 *
 * Sets a persistent (1 year) non-httpOnly "currency" cookie so the user's
 * manual choice survives refresh, browser restarts, login and logout, then
 * redirects back to the page the user was on. The cookie always overrides the
 * default on subsequent requests. Mirrors /set-language in routes/language.js.
 */
const express = require('express');
const router = express.Router();
const { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } = require('../config/currencies');

const CURRENCY_COOKIE = 'currency';
const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

router.get('/set-currency', (req, res) => {
  const currency = SUPPORTED_CURRENCIES.includes(req.query.currency)
    ? req.query.currency
    : DEFAULT_CURRENCY;

  res.cookie(CURRENCY_COOKIE, currency, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: 'lax',
    path: '/'
  });

  if (req.session && req.session.userId) {
    req.session.currency = currency;
  }

  // Redirect back to the requesting page. Only accept same-origin relative
  // paths to prevent open redirects, and strip any existing currency query
  // param to avoid loops.
  let redirect = String(req.query.redirect || '/');
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    redirect = '/';
  }
  redirect = redirect.replace(/[?&]currency=[^&]*/, '').replace(/[?&]+$/, '');
  if (!redirect) redirect = '/';

  res.redirect(redirect);
});

module.exports = router;
