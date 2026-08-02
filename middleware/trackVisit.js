const crypto = require('crypto');
const { query } = require('../config/db');

/**
 * Records a unique daily visitor (by IP) so marketing analytics can report
 * website visitors. Uses INSERT IGNORE + a unique (date, visitor_key) key so a
 * repeat visitor in the same day is not double counted.
 */
async function trackVisit(req, res, next) {
  if (req.method !== 'GET') return next();
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const visitorKey = crypto.createHash('sha1').update(ip).digest('hex').slice(0, 32);
    const today = new Date().toISOString().slice(0, 10);
    await query(
      'INSERT IGNORE INTO website_visits (visit_date, visitor_key, page_path) VALUES (?, ?, ?)',
      [today, visitorKey, req.originalUrl || '/']
    );
  } catch (err) {
    // Analytics should never break the app
    console.error('Visit tracking failed:', err.message);
  }
  next();
}

module.exports = { trackVisit };
