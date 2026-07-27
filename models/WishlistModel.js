const { query, queryOne } = require('../config/db');

class WishlistModel {
  async add(userId, productId) {
    const existing = await queryOne(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing) return existing;

    const result = await query(
      'INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );
    return queryOne('SELECT * FROM wishlists WHERE id = ?', [result.insertId]);
  }

  async remove(userId, productId) {
    await query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
    return true;
  }

  async getByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT w.*, p.name, p.slug, p.price, p.discount_price, p.main_image, p.status AS product_status,
              c.name AS category_name
       FROM wishlists w
       INNER JOIN products p ON w.product_id = p.id
       LEFT JOIN product_categories c ON p.category_id = c.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const countRow = await queryOne(
      'SELECT COUNT(*) AS total FROM wishlists WHERE user_id = ?',
      [userId]
    );
    return { items: rows, total: countRow.total, page, limit };
  }

  async isWishlisted(userId, productId) {
    const row = await queryOne(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return !!row;
  }
}

module.exports = new WishlistModel();
