const { query, queryOne } = require('../config/db');
const crypto = require('crypto');

class PasswordResetModel {
  async create(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      [userId]
    );

    const result = await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    return { token, expiresAt };
  }

  async findByToken(token) {
    return queryOne(
      `SELECT prt.*, u.email, u.first_name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > NOW()`,
      [token]
    );
  }

  async markUsed(token) {
    await query('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);
    return true;
  }
}

module.exports = new PasswordResetModel();
