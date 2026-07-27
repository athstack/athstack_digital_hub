const pool = require('../config/db');

class ContactModel {
  async addMessage(data) {
    const [result] = await pool.execute(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [data.name, data.email, data.message]
    );
    return result.affectedRows > 0;
  }

  async getMessages() {
    const [rows] = await pool.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return rows;
  }
}

module.exports = new ContactModel();
