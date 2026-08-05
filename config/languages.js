/**
 * Supported languages and locale configuration.
 *
 * Add a new language here (plus a matching /locales/<code>/ folder with
 * namespace JSON files) to enable it across the entire application.
 */

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr', locale: 'en-US' },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', flag: '🇹🇿', dir: 'ltr', locale: 'sw-TZ' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', locale: 'ar-SA' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', locale: 'es-ES' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr', locale: 'pt-PT' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', locale: 'de-DE' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr', locale: 'zh-CN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', locale: 'hi-IN' }
];

const SUPPORTED_LANGS = LANGUAGES.map((l) => l.code);
const DEFAULT_LANG = 'en';

const LANG_MAP = LANGUAGES.reduce((acc, l) => {
  acc[l.code] = l;
  return acc;
}, {});

const RTL_LANGS = LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code);

/**
 * Map a country (ISO 3166-1 alpha-2) to a suggested language.
 * Used only as the initial default; never forced.
 */
const COUNTRY_LANG_MAP = {
  TZ: 'sw',
  KE: 'sw',
  UG: 'en',
  FR: 'fr',
  DE: 'de',
  ES: 'es',
  PT: 'pt',
  BR: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  IN: 'hi',
  NP: 'hi',
  US: 'en',
  GB: 'en',
  CA: 'en',
  NG: 'en',
  ZA: 'en',
  GH: 'en',
  RW: 'en',
  ET: 'en',
  CM: 'en',
  EG: 'ar',
  SA: 'ar',
  AE: 'ar',
  MA: 'ar',
  DZ: 'ar',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es'
};

/**
 * Map a browser language tag (e.g. "fr-FR") to a supported language code.
 */
function languageCodeFromTag(tag) {
  if (!tag) return null;
  const normalized = String(tag).toLowerCase().replace('_', '-');
  const [base] = normalized.split('-');
  if (SUPPORTED_LANGS.includes(normalized)) return normalized;
  if (SUPPORTED_LANGS.includes(base)) return base;
  return null;
}

/**
 * Resolve the best supported language given a list of browser language tags,
 * e.g. req.acceptsLanguages() or navigator.languages.
 */
function detectFromBrowserTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  for (const tag of tags) {
    const code = languageCodeFromTag(tag);
    if (code) return code;
  }
  return null;
}

function isRtl(code) {
  return RTL_LANGS.includes(code);
}

module.exports = {
  LANGUAGES,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  LANG_MAP,
  RTL_LANGS,
  COUNTRY_LANG_MAP,
  languageCodeFromTag,
  detectFromBrowserTags,
  isRtl
};
