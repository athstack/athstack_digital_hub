const { query, queryOne } = require('../config/db');

class ReviewModel {
  async create({ user_id, product_id, technician_id, repair_id, rating, comment, type }) {
    const result = await query(
      `INSERT INTO reviews (user_id, product_id, technician_id, repair_id, rating, comment, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, product_id || null, technician_id || null, repair_id || null, rating, comment || null, type]
    );
    return queryOne('SELECT * FROM reviews WHERE id = ?', [result.insertId]);
  }

  async getByProduct(productId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT r.*, u.first_name, u.last_name, u.avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'active'
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );
    const countRow = await queryOne(
      "SELECT COUNT(*) AS total FROM reviews WHERE product_id = ? AND status = 'active'",
      [productId]
    );
    return { reviews: rows, total: countRow.total, page, limit };
  }

  async getByTechnician(technicianId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT r.*, u.first_name, u.last_name, u.avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.technician_id = ? AND r.status = 'active'
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [technicianId, limit, offset]
    );
    const countRow = await queryOne(
      "SELECT COUNT(*) AS total FROM reviews WHERE technician_id = ? AND status = 'active'",
      [technicianId]
    );
    return { reviews: rows, total: countRow.total, page, limit };
  }

  async getByUser(userId) {
    return query(
      `SELECT r.*,
              p.name AS product_name, p.slug AS product_slug, p.main_image AS product_image
       FROM reviews r
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
  }

  async delete(id) {
    await query('DELETE FROM reviews WHERE id = ?', [id]);
    return true;
  }

  async getAverageRating(productId) {
    const row = await queryOne(
      "SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS total_reviews FROM reviews WHERE product_id = ? AND status = 'active'",
      [productId]
    );
    return { average: parseFloat(row.average_rating), count: row.total_reviews };
  }
}

module.exports = new ReviewModel();
