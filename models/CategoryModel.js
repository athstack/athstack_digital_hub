const { query, queryOne } = require('../config/db');

class CategoryModel {
  async getAll() {
    return query('SELECT * FROM product_categories ORDER BY sort_order ASC, name ASC');
  }

  async findById(id) {
    return queryOne('SELECT * FROM product_categories WHERE id = ?', [id]);
  }

  async findBySlug(slug) {
    return queryOne('SELECT * FROM product_categories WHERE slug = ?', [slug]);
  }

  async create(data) {
    const result = await query(
      'INSERT INTO product_categories (name, slug, description, icon, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.slug, data.description || null, data.icon || null, data.sort_order || 0, data.status || 'active']
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && ['name', 'slug', 'description', 'icon', 'sort_order', 'status'].includes(key)) {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await query(`UPDATE product_categories SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    await query('DELETE FROM product_categories WHERE id = ?', [id]);
    return true;
  }

  async countProducts(id) {
    const row = await queryOne(
      'SELECT COUNT(*) AS total FROM products WHERE category_id = ?',
      [id]
    );
    return row.total;
  }
}

module.exports = new CategoryModel();
