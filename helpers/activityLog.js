const { query } = require('../config/db');

/**
 * Record an entry in the activity_logs table.
 * @param {Object} req - Express request (for user + IP context)
 * @param {string} action - e.g. 'create', 'update', 'publish', 'archive'
 * @param {string} resource - e.g. 'campaign', 'coupon', 'blog_post'
 * @param {number|null} resourceId
 */
async function logActivity(req, action, resource, resourceId = null) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, username, role, action, resource, resource_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session && req.session.userId ? req.session.userId : null,
        req.session && req.session.userName ? req.session.userName : null,
        req.session && req.session.userRole ? req.session.userRole : null,
        action,
        resource,
        resourceId,
        req.ip || req.connection.remoteAddress || null
      ]
    );
  } catch (err) {
    console.error('Activity log write failed:', err.message);
  }
}

module.exports = { logActivity };
