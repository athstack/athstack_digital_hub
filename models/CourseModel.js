const { query, queryOne, pool } = require('../config/db');

class CourseModel {
  async getActive() {
    return query(
      `SELECT tc.*, u.first_name AS instructor_first_name, u.last_name AS instructor_last_name, u.avatar AS instructor_avatar
       FROM training_courses tc
       LEFT JOIN users u ON tc.instructor_id = u.id
       WHERE tc.status = 'active'
       ORDER BY tc.created_at DESC`
    );
  }

  async getAll({ status, search, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (status && ['active', 'draft'].includes(status)) {
      conditions.push('tc.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(tc.title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT tc.*, u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = tc.id) AS enrollment_count
       FROM training_courses tc
       LEFT JOIN users u ON tc.instructor_id = u.id
       ${where}
       ORDER BY tc.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM training_courses tc
       LEFT JOIN users u ON tc.instructor_id = u.id
       ${where}`,
      params
    );

    return { courses: rows, total: countRow.total, page, limit };
  }

  async findBySlug(slug) {
    return queryOne(
      `SELECT tc.*, u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
              u.bio AS instructor_bio, u.avatar AS instructor_avatar,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = tc.id) AS enrollment_count
       FROM training_courses tc
       LEFT JOIN users u ON tc.instructor_id = u.id
       WHERE tc.slug = ?`,
      [slug]
    );
  }

  async findById(id) {
    return queryOne(
      `SELECT tc.*, u.first_name AS instructor_first_name, u.last_name AS instructor_last_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = tc.id) AS enrollment_count
       FROM training_courses tc
       LEFT JOIN users u ON tc.instructor_id = u.id
       WHERE tc.id = ?`,
      [id]
    );
  }

  async create(data) {
    const result = await query(
      `INSERT INTO training_courses (instructor_id, title, slug, description, duration, level, price, image_path, status, max_enrollments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.instructor_id || null, data.title, data.slug,
        data.description || null, data.duration || null,
        data.level || 'Beginner', data.price,
        data.image_path || null, data.status || 'draft',
        data.max_enrollments || 0
      ]
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const fields = ['instructor_id', 'title', 'slug', 'description', 'duration', 'level', 'price', 'image_path', 'status', 'max_enrollments'];
    const sets = [];
    const params = [];

    for (const f of fields) {
      if (data[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(data[f]);
      }
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await query(`UPDATE training_courses SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    await query('DELETE FROM training_courses WHERE id = ?', [id]);
    return true;
  }

  async enroll(userId, courseId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const course = (await connection.execute(
        'SELECT * FROM training_courses WHERE id = ?',
        [courseId]
      ))[0][0];

      if (!course) {
        await connection.rollback();
        throw new Error('Course not found');
      }

      if (course.max_enrollments > 0) {
        const countRow = (await connection.execute(
          'SELECT COUNT(*) AS total FROM enrollments WHERE course_id = ?',
          [courseId]
        ))[0][0];

        if (countRow.total >= course.max_enrollments) {
          await connection.rollback();
          throw new Error('Course is full');
        }
      }

      const existing = (await connection.execute(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      ))[0][0];

      if (existing) {
        await connection.rollback();
        throw new Error('Already enrolled');
      }

      await connection.execute(
        'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
        [userId, courseId]
      );

      await connection.commit();

      return this.isEnrolled(userId, courseId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async isEnrolled(userId, courseId) {
    return queryOne(
      'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
  }

  async getEnrollments(userId) {
    return query(
      `SELECT e.*, tc.title AS course_title, tc.slug AS course_slug, tc.image_path AS course_image,
              tc.duration AS course_duration, tc.level AS course_level,
              u.first_name AS instructor_first_name, u.last_name AS instructor_last_name
       FROM enrollments e
       INNER JOIN training_courses tc ON e.course_id = tc.id
       LEFT JOIN users u ON tc.instructor_id = u.id
       WHERE e.user_id = ?
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );
  }

  async countEnrollments(courseId) {
    const row = await queryOne(
      'SELECT COUNT(*) AS total FROM enrollments WHERE course_id = ?',
      [courseId]
    );
    return row.total;
  }

  async getByInstructor(instructorId) {
    return query(
      `SELECT tc.*,
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = tc.id) AS enrollment_count
       FROM training_courses tc
       WHERE tc.instructor_id = ?
       ORDER BY tc.created_at DESC`,
      [instructorId]
    );
  }

  async updateProgress(enrollmentId, progress) {
    const sets = ['progress = ?'];
    const params = [progress];

    if (progress >= 100) {
      sets.push('enrollment_status = ?');
      params.push('completed');
      sets.push('completed_at = NOW()');
    }

    params.push(enrollmentId);
    await query(`UPDATE enrollments SET ${sets.join(', ')} WHERE id = ?`, params);
    return queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);
  }
}

module.exports = new CourseModel();
