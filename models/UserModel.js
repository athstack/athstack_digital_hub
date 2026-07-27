const pool = require('../config/db');

class UserModel {
  async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  async register(data) {
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.first_name, data.last_name, data.email, data.phone, data.password, data.role || 'customer', data.status || 'active']
    );
    return result.affectedRows > 0;
  }

  async getTotalUsers() {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    return rows[0].count;
  }

  async getAllUsers() {
    const [rows] = await pool.execute('SELECT id, first_name, last_name, email, phone, role, status FROM users ORDER BY id DESC');
    return rows;
  }

  async getById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async updateRole(id, role) {
    const [result] = await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return result.affectedRows > 0;
  }

  async updateDetails(data) {
    const [result] = await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [data.first_name, data.last_name, data.email, data.id]
    );
    return result.affectedRows > 0;
  }

  async getRegisteredCourses(userId) {
    const [rows] = await pool.execute(
      `SELECT tc.* FROM training_courses tc
       JOIN course_registrations cr ON tc.id = cr.course_id
       WHERE cr.user_id = ?`,
      [userId]
    );
    return rows;
  }
}

module.exports = new UserModel();
