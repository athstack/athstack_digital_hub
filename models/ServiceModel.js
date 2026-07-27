const { query, queryOne } = require('../config/db');

class ServiceModel {
  async getAll() {
    return query("SELECT * FROM services WHERE status = 'active' ORDER BY category ASC, title ASC");
  }

  async getByCategory(category) {
    return query(
      'SELECT * FROM services WHERE category = ? AND status = ? ORDER BY title ASC',
      [category, 'active']
    );
  }

  async findById(id) {
    return queryOne('SELECT * FROM services WHERE id = ?', [id]);
  }

  async findBySlug(slug) {
    return queryOne('SELECT * FROM services WHERE slug = ?', [slug]);
  }

  async create(data) {
    const result = await query(
      'INSERT INTO services (title, slug, category, description, base_price, icon_class, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.title, data.slug, data.category, data.description || null, data.base_price, data.icon_class || 'fa-tools', data.status || 'active']
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && ['title', 'slug', 'category', 'description', 'base_price', 'icon_class', 'status'].includes(key)) {
        sets.push(`${key} = ?`);
        params.push(val);
      }
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await query(`UPDATE services SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    await query('DELETE FROM services WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new ServiceModel();
