const slugify = require('slugify');
const { LANG_MAP, DEFAULT_LANG } = require('../config/languages');

/**
 * Generate a URL-friendly slug from text
 * @param {string} text
 * @returns {string}
 */
function generateSlug(text) {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true
  });
}

/**
 * Locale-aware currency formatter.
 *
 * Formatting follows the selected language/locale, e.g.:
 *   English:  $25,000.00
 *   French:   25 000,00 €
 *   German:   25.000,00 €
 *   Swahili:  TZS 25,000
 * @param {number} amount
 * @param {string} [lang] - Language code (defaults to English)
 * @returns {string}
 */
function formatCurrency(amount, lang = DEFAULT_LANG) {
  const conf = LANG_MAP[lang] || LANG_MAP[DEFAULT_LANG];
  const value = amount === null || amount === undefined ? 0 : Number(amount);
  try {
    if (conf.currency === 'TZS') {
      return new Intl.NumberFormat(conf.locale, {
        style: 'currency',
        currency: 'TZS',
        currencyDisplay: 'code',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return new Intl.NumberFormat(conf.locale, {
      style: 'currency',
      currency: conf.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (e) {
    return '$' + value.toFixed(2);
  }
}

/**
 * Locale-aware date formatter.
 * @param {Date|string} date
 * @param {string} [lang] - Language code (defaults to English)
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
function formatDate(date, lang = DEFAULT_LANG, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const conf = LANG_MAP[lang] || LANG_MAP[DEFAULT_LANG];
  const defaults = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  try {
    return d.toLocaleDateString(conf.locale, defaults);
  } catch (e) {
    return d.toLocaleDateString(LANG_MAP[DEFAULT_LANG].locale, defaults);
  }
}

/**
 * Truncate text to a given length with ellipsis
 * @param {string} text
 * @param {number} length
 * @returns {string}
 */
function truncateText(text, length = 100) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length).trimEnd() + '...';
}

/**
 * Calculate discount percentage between original and discounted price
 * @param {number} price - Original price
 * @param {number} discountPrice - Discounted price
 * @returns {number} Percentage discount (0-100)
 */
function calculateDiscount(price, discountPrice) {
  if (!price || !discountPrice || price <= discountPrice) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

/**
 * Get Bootstrap badge class for a given status
 * @param {string} status
 * @returns {string}
 */
function getStatusBadgeClass(status) {
  const map = {
    pending: 'bg-warning text-dark',
    processing: 'bg-info text-dark',
    shipped: 'bg-primary',
    delivered: 'bg-success',
    completed: 'bg-success',
    cancelled: 'bg-danger',
    refunded: 'bg-secondary',
    active: 'bg-success',
    inactive: 'bg-secondary',
    draft: 'bg-secondary',
    published: 'bg-success',
    open: 'bg-info text-dark',
    in_repair: 'bg-primary',
    assigned: 'bg-info text-dark',
    diagnosing: 'bg-info text-dark',
    awaiting_parts: 'bg-warning text-dark',
    resolved: 'bg-success',
    closed: 'bg-secondary',
    paid: 'bg-success',
    unpaid: 'bg-warning text-dark',
    failed: 'bg-danger',
    confirmed: 'bg-info text-dark',
    out_of_stock: 'bg-danger',
    suspended: 'bg-danger',
    archived: 'bg-secondary',
    enrolling: 'bg-info text-dark',
    dropped: 'bg-secondary',
    hidden: 'bg-secondary',
    flagged: 'bg-danger',
    replied: 'bg-success',
    read: 'bg-success',
    unread: 'bg-warning text-dark'
  };
  return map[(status || '').toLowerCase()] || 'bg-secondary';
}

/**
 * Paginate an array
 * @param {Array} array
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {{ data: Array, page: number, limit: number, totalPages: number, totalItems: number, hasNext: boolean, hasPrev: boolean }}
 */
function paginate(array, page = 1, limit = 10) {
  const totalItems = array.length;
  const totalPages = Math.ceil(totalItems / limit);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * limit;
  const data = array.slice(start, start + limit);

  return {
    data,
    page: safePage,
    limit,
    totalPages,
    totalItems,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1
  };
}

module.exports = {
  generateSlug,
  formatCurrency,
  formatDate,
  truncateText,
  calculateDiscount,
  getStatusBadgeClass,
  paginate
};
