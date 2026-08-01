/**
 * Server-side language detection + request-scoped i18n locals.
 *
 * Detection priority:
 *   1. ?lang= query parameter
 *   2. "lang" cookie (persisted user preference)
 *   3. Accept-Language header (browser / OS preference), with region-aware
 *      country suggestions (e.g. en-TZ -> Kiswahili)
 *   4. English (fallback)
 *
 * A user's manually chosen language (cookie / localStorage) always overrides
 * automatic detection.
 */
const { i18next, ensureLanguageLoaded, getT } = require('../config/i18n');
const {
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  LANG_MAP,
  COUNTRY_LANG_MAP,
  languageCodeFromTag,
  LANGUAGES
} = require('../config/languages');
const { formatCurrency, formatDate } = require('../utils/helpers');

const LANG_COOKIE = 'lang';

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      try {
        out[key] = decodeURIComponent(pair.slice(idx + 1).trim());
      } catch (e) {
        out[key] = pair.slice(idx + 1).trim();
      }
    }
  });
  return out;
}

/**
 * Resolve the best supported language for a request.
 */
function resolveLanguage(req) {
  // 1. Query parameter (?lang=fr)
  const q = req.query && req.query.lang;
  if (q && SUPPORTED_LANGS.includes(q)) return q;

  // 2. Persisted cookie
  const cookies = parseCookies(req.headers.cookie);
  const cookieLang = cookies[LANG_COOKIE];
  if (cookieLang && SUPPORTED_LANGS.includes(cookieLang)) return cookieLang;

  // 3. Browser Accept-Language (with region-aware country suggestions)
  let tags = [];
  if (req.acceptsLanguages) {
    tags = req.acceptsLanguages() || [];
  }
  for (const tag of tags) {
    const norm = String(tag).toLowerCase().replace('_', '-');
    const [base, region] = norm.split('-');

    // English browsers with a region that maps to another supported language:
    // en-TZ -> sw, en-KE -> sw, en-IN -> hi, en-DE -> de, en-CN -> zh ...
    if (base === 'en' && region && region !== 'us' && region !== 'gb') {
      const suggested = COUNTRY_LANG_MAP[region];
      if (suggested) return suggested;
    }

    const code = languageCodeFromTag(tag);
    if (code) return code;
  }

  return DEFAULT_LANG;
}

/**
 * Express middleware: detect language, ensure bundles loaded, expose locals.
 */
async function i18nMiddleware(req, res, next) {
  try {
    const lang = resolveLanguage(req);
    await ensureLanguageLoaded(lang);

    req.language = lang;
    req.t = getT(lang);
    req.i18n = i18next;

    res.locals.t = req.t;
    res.locals.i18n = i18next;
    res.locals.lang = lang;
    res.locals.dir = LANG_MAP[lang].dir;
    res.locals.currentLang = LANG_MAP[lang];
    res.locals.LANGUAGES = LANGUAGES;
    res.locals.formatCurrency = (amount) => formatCurrency(amount, lang);
    res.locals.formatDate = (date, options) => formatDate(date, lang, options);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { i18nMiddleware, resolveLanguage, parseCookies };
