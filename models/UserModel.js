const { query, queryOne } = require('../config/db');

class UserModel {
  async findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE email = ?', [email]);
  }

  async findById(id) {
    return queryOne('SELECT * FROM users WHERE id = ?', [id]);
  }

  async create({ first_name, last_name, email, phone, country, password, role = 'customer' }) {
    const result = await query(
      'INSERT INTO users (first_name, last_name, email, phone, country, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, phone, country || null, password, role]
    );
    return { id: result.insertId, first_name, last_name, email, phone, country, role };
  }

  async updateProfile(id, { first_name, last_name, email, phone, country, avatar }) {
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, country = ?, avatar = ? WHERE id = ?',
      [first_name, last_name, email, phone, country || null, avatar, id]
    );
    return this.findById(id);
  }

  async updatePassword(id, hashedPassword) {
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    return true;
  }

  async updateRole(id, role) {
    await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return this.findById(id);
  }

  async updateStatus(id, status) {
    await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  async adminUpdate(id, { first_name, last_name, email, phone, role, status, password }) {
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, status = ?, password = ? WHERE id = ?',
        [first_name, last_name, email, phone || null, role, status, hashed, id]
      );
    } else {
      await query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
        [first_name, last_name, email, phone || null, role, status, id]
      );
    }
    return this.findById(id);
  }

  async delete(id) {
    return query('DELETE FROM users WHERE id = ?', [id]);
  }

  async getAll({ role, status, search, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT id, first_name, last_name, email, phone, country, role, status, avatar, bio, specialization, created_at, updated_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );

    return { users: rows, total: countRow.total, page, limit };
  }

  async countAll({ role, status } = {}) {
    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = await queryOne(`SELECT COUNT(*) AS total FROM users ${where}`, params);
    return row.total;
  }

  async getTechnicians() {
    let techs = await query(
      "SELECT id, first_name, last_name, email, avatar, bio, specialization, role FROM users WHERE role = 'technician' AND status = 'active'"
    );
    if (!techs || techs.length === 0) {
      techs = await query(
        "SELECT id, first_name, last_name, email, avatar, bio, specialization, role FROM users WHERE role = 'admin' AND status = 'active'"
      );
    }
    return techs;
  }

  async searchByTerm(term) {
    const like = `%${term}%`;
    return query(
      `SELECT id, first_name, last_name, email, phone, role, status, avatar
       FROM users
       WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
       ORDER BY first_name ASC
       LIMIT 20`,
      [like, like, like]
    );
  }
}

module.exports = new UserModel();
