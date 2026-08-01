/**
 * Language switching endpoint.
 *
 * GET /set-language?lang=fr&redirect=/shop/some-product
 *
 * Sets a persistent (1 year) non-httpOnly "lang" cookie so the user's manual
 * choice survives refresh, browser restarts, login and logout, then redirects
 * back to the page the user was on. The cookie always overrides automatic
 * Accept-Language detection on subsequent requests.
 */
const express = require('express');
const router = express.Router();
const { SUPPORTED_LANGS, DEFAULT_LANG } = require('../config/languages');

const LANG_COOKIE = 'lang';
const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

router.get('/set-language', (req, res) => {
  const lang = SUPPORTED_LANGS.includes(req.query.lang) ? req.query.lang : DEFAULT_LANG;

  res.cookie(LANG_COOKIE, lang, {
    maxAge: ONE_YEAR,
    httpOnly: false,
    sameSite: 'lax',
    path: '/'
  });

  // Redirect back to the requesting page (server-rendered reload picks up the
  // new language). Only accept same-origin relative paths to prevent open
  // redirects, and strip any existing lang query param to avoid loops.
  let redirect = String(req.query.redirect || '/');
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    redirect = '/';
  }
  redirect = redirect.replace(/[?&]lang=[^&]*/, '').replace(/[?&]+$/, '');
  if (!redirect) redirect = '/';

  res.redirect(redirect);
});

module.exports = router;
