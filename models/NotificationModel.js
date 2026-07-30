const { query, queryOne, pool } = require('../config/db');

class NotificationModel {
  async create(userId, { title, message, type, link }) {
    const result = await query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type || null, link || null]
    );
    return queryOne('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
  }

  async getByUser(userId, limit = 50, unreadOnly = false) {
    const where = unreadOnly ? 'AND is_read = 0' : '';
    return query(
      `SELECT * FROM notifications
       WHERE user_id = ? ${where}
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
  }

  async markAsRead(id) {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return true;
  }

  async markAllAsRead(userId) {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    return true;
  }

  async countUnread(userId) {
    const row = await queryOne(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return row.total;
  }

  async delete(id) {
    await query('DELETE FROM notifications WHERE id = ?', [id]);
    return true;
  }

  async notifyAdmins({ title, message, type, link }) {
    const [admins] = await pool.execute(
      "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND status = 'active'"
    );
    for (const admin of admins) {
      await this.create(admin.id, { title, message, type, link });
    }
    return admins.length;
  }
}

module.exports = new NotificationModel();
