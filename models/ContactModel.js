const { query, queryOne } = require('../config/db');

class ContactModel {
  async create({ name, email, phone, subject, message, user_id }) {
    const result = await query(
      'INSERT INTO contact_messages (user_id, name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id || null, name, email, phone || null, subject || null, message]
    );
    return queryOne('SELECT * FROM contact_messages WHERE id = ?', [result.insertId]);
  }

  async getAll({ status, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('cm.status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT cm.*, u.first_name AS replied_first_name, u.last_name AS replied_last_name
       FROM contact_messages cm
       LEFT JOIN users u ON cm.replied_by = u.id
       ${where} ORDER BY cm.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM contact_messages cm ${where}`,
      params
    );

    return { messages: rows, total: countRow.total, page, limit };
  }

  async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT cm.*, u.first_name AS replied_first_name, u.last_name AS replied_last_name
       FROM contact_messages cm
       LEFT JOIN users u ON cm.replied_by = u.id
       WHERE cm.user_id = ?
       ORDER BY cm.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const countRow = await queryOne('SELECT COUNT(*) AS total FROM contact_messages WHERE user_id = ?', [userId]);
    return { messages: rows, total: countRow.total, page, limit };
  }

  async getById(id) {
    return queryOne(
      `SELECT cm.*, u.first_name AS replied_first_name, u.last_name AS replied_last_name
       FROM contact_messages cm
       LEFT JOIN users u ON cm.replied_by = u.id
       WHERE cm.id = ?`,
      [id]
    );
  }

  async addReply(id, replyText, repliedBy) {
    await query(
      "UPDATE contact_messages SET reply_text = ?, replied_at = NOW(), replied_by = ?, status = 'replied' WHERE id = ?",
      [replyText, repliedBy, id]
    );
    return this.getById(id);
  }

  async countAll(status) {
    const params = [];
    let where = '';
    if (status) {
      where = 'WHERE status = ?';
      params.push(status);
    }
    const row = await queryOne(`SELECT COUNT(*) AS total FROM contact_messages ${where}`, params);
    return row.total;
  }

  async countByUser(userId) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM contact_messages WHERE user_id = ?', [userId]);
    return row.total;
  }

  async markAsRead(id) {
    await query("UPDATE contact_messages SET status = 'read' WHERE id = ?", [id]);
    return true;
  }

  async markAsReplied(id) {
    await query("UPDATE contact_messages SET status = 'replied' WHERE id = ?", [id]);
    return true;
  }

  async delete(id) {
    await query('DELETE FROM contact_messages WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new ContactModel();
