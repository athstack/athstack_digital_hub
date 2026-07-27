const { query, queryOne } = require('../config/db');

class ContactModel {
  async create({ name, email, phone, subject, message }) {
    const result = await query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, subject || null, message]
    );
    return queryOne('SELECT * FROM contact_messages WHERE id = ?', [result.insertId]);
  }

  async getAll({ status, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT * FROM contact_messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM contact_messages ${where}`,
      params
    );

    return { messages: rows, total: countRow.total, page, limit };
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

  async markAsRead(id) {
    await query("UPDATE contact_messages SET status = 'read' WHERE id = ?", [id]);
    return true;
  }

  async markAsReplied(id) {
    await query("UPDATE contact_messages SET status = 'replied' WHERE id = ?", [id]);
    return true;
  }
}

module.exports = new ContactModel();
