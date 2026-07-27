const pool = require('../config/db');

class ProductModel {
  async getFiltered(categorySlug, search, minPrice, maxPrice) {
    let sql = `SELECT p.*, c.name as category_name FROM products p
               JOIN categories c ON p.category_id = c.id
               WHERE p.status = 'active' AND p.price BETWEEN ? AND ?`;
    const params = [minPrice, maxPrice];

    if (categorySlug) {
      sql += ' AND c.slug = ?';
      params.push(categorySlug);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async getCategories(type) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE type = ?', [type]);
    return rows;
  }

  async getBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.status = 'active'`,
      [slug]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getGalleryImages(productId) {
    const [rows] = await pool.execute(
      'SELECT image_path FROM product_images WHERE product_id = ?',
      [productId]
    );
    return rows.map(r => r.image_path);
  }

  async getSearchSuggestions(term) {
    const [rows] = await pool.execute(
      `SELECT name, slug, price, main_image FROM products
       WHERE name LIKE ? AND status = 'active' LIMIT 5`,
      [`%${term}%`]
    );
    return rows;
  }

  async getAll() {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');
    return rows;
  }

  async getById(id) {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async slugExists(slug) {
    const [rows] = await pool.execute('SELECT id FROM products WHERE slug = ?', [slug]);
    return rows.length > 0;
  }

  async add(data) {
    const [result] = await pool.execute(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, main_image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.category_id, data.name, data.slug, data.description, data.price, data.stock_quantity, data.main_image]
    );
    return result.affectedRows > 0;
  }

  async update(data, id) {
    let sql = `UPDATE products SET category_id = ?, name = ?, description = ?,
               price = ?, stock_quantity = ?`;
    const params = [data.category_id, data.name, data.description, data.price, data.stock_quantity];

    if (data.main_image) {
      sql += ', main_image = ?';
      params.push(data.main_image);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    const [result] = await pool.execute(sql, params);
    return result.affectedRows > 0;
  }

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new ProductModel();
