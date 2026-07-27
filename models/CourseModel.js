const pool = require('../config/db');

class CourseModel {
  async getAll() {
    const [rows] = await pool.execute('SELECT * FROM training_courses ORDER BY id DESC');
    return rows;
  }

  async getActive() {
    const [rows] = await pool.execute("SELECT * FROM training_courses WHERE status = 'active' ORDER BY id ASC");
    return rows;
  }

  async getById(id) {
    const [rows] = await pool.execute('SELECT * FROM training_courses WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async add(data) {
    const [result] = await pool.execute(
      `INSERT INTO training_courses (title, slug, description, duration, status, level, price, instructor, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.slug, data.description, data.duration, data.status, data.level, data.price, data.instructor, data.image_path]
    );
    return result.affectedRows > 0;
  }

  async update(data, id) {
    const [result] = await pool.execute(
      `UPDATE training_courses SET title = ?, description = ?, duration = ?, status = ?, level = ?, price = ? WHERE id = ?`,
      [data.title, data.description, data.duration, data.status, data.level, data.price, id]
    );
    return result.affectedRows > 0;
  }

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM training_courses WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async enrollUser(userId, courseId) {
    const [check] = await pool.execute(
      'SELECT COUNT(*) as count FROM course_registrations WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (check[0].count > 0) return true;

    const [result] = await pool.execute(
      `INSERT INTO course_registrations (user_id, course_id, payment_status) VALUES (?, ?, 'unpaid')`,
      [userId, courseId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new CourseModel();
