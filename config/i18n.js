/**
 * i18next initialization for server-side rendering.
 *
 * Translation files live in /locales/<lang>/<namespace>.json and are loaded
 * lazily on first request for a given language, then cached in memory.
 */
const path = require('path');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const { SUPPORTED_LANGS, DEFAULT_LANG } = require('./languages');

const NAMESPACES = [
  'common',
  'home',
  'shop',
  'cart',
  'auth',
  'contact',
  'about',
  'maintenance',
  'training',
  'dashboard',
  'admin',
  'technician'
];

const LOCALES_DIR = path.join(__dirname, '..', 'locales');

i18next
  .use(Backend)
  .init({
    backend: {
      loadPath: path.join(LOCALES_DIR, '{{lng}}', '{{ns}}.json')
    },
    fallbackLng: DEFAULT_LANG,
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: false,
    ns: NAMESPACES,
    defaultNS: 'common',
    fallbackNS: ['common'],
    preload: [DEFAULT_LANG],
    load: 'all',
    interpolation: {
      escapeValue: false
    },
    returnEmptyString: false,
    saveMissing: false,
    initImmediate: false
  });

/**
 * Preload every namespace for a language (no-op if already cached).
 * Keeps template `t('ns:key')` calls race-free on first request.
 */
async function ensureLanguageLoaded(lng) {
  const safeLng = SUPPORTED_LANGS.includes(lng) ? lng : DEFAULT_LANG;
  await i18next.loadLanguages(safeLng);
  await i18next.loadNamespaces(NAMESPACES);
}

/**
 * Return a `t()` bound to a fixed language/namespace for a request.
 */
function getT(lng, ns) {
  return i18next.getFixedT(lng, ns);
}

module.exports = { i18next, NAMESPACES, LOCALES_DIR, ensureLanguageLoaded, getT };
