const { query, queryOne } = require('../config/db');

class ProductModel {
  async getFiltered({ category, search, minPrice, maxPrice, sort, page = 1, limit = 20, technician_id, status, featured } = {}) {
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('c.slug = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }
    if (minPrice) {
      conditions.push('p.price >= ?');
      params.push(minPrice);
    }
    if (maxPrice) {
      conditions.push('p.price <= ?');
      params.push(maxPrice);
    }
    if (technician_id) {
      conditions.push('p.technician_id = ?');
      params.push(technician_id);
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    } else {
      conditions.push("p.status = 'active'");
    }
    if (featured) {
      conditions.push('p.featured = 1');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.created_at DESC';
    switch (sort) {
      case 'price_asc': orderBy = 'p.price ASC'; break;
      case 'price_desc': orderBy = 'p.price DESC'; break;
      case 'name_asc': orderBy = 'p.name ASC'; break;
      case 'name_desc': orderBy = 'p.name DESC'; break;
      case 'rating': orderBy = 'p.rating DESC'; break;
      case 'sales': orderBy = 'p.total_sales DESC'; break;
      case 'newest': orderBy = 'p.created_at DESC'; break;
    }

    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.technician_id = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       ${where}`,
      params
    );

    return { products: rows, total: countRow.total, page, limit };
  }

  async findBySlug(slug) {
    return queryOne(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              u.id AS technician_id_user, u.first_name AS technician_first_name,
              u.last_name AS technician_last_name, u.avatar AS technician_avatar,
              u.bio AS technician_bio, u.specialization AS technician_specialization
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.technician_id = u.id
       WHERE p.slug = ?`,
      [slug]
    );
  }

  async findById(id) {
    return queryOne(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
              u.id AS technician_id_user, u.first_name AS technician_first_name,
              u.last_name AS technician_last_name
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.technician_id = u.id
       WHERE p.id = ?`,
      [id]
    );
  }

  async create(data) {
    const fields = ['name', 'slug', 'description', 'price', 'discount_price', 'stock_quantity', 'main_image', 'status', 'featured', 'sku'];
    const cols = [];
    const vals = [];
    const params = [];

    for (const f of fields) {
      if (data[f] !== undefined) {
        cols.push(f);
        vals.push('?');
        params.push(data[f]);
      }
    }
    if (data.technician_id !== undefined) { cols.push('technician_id'); vals.push('?'); params.push(data.technician_id); }
    if (data.category_id !== undefined) { cols.push('category_id'); vals.push('?'); params.push(data.category_id); }

    const result = await query(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${vals.join(', ')})`,
      params
    );
    return this.findById(result.insertId);
  }

  async update(id, data) {
    const fields = ['name', 'slug', 'description', 'price', 'discount_price', 'stock_quantity', 'main_image', 'status', 'featured', 'technician_id', 'category_id', 'sku'];
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
    await query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    await query('DELETE FROM products WHERE id = ?', [id]);
    return true;
  }

  async incrementSales(id, qty) {
    await query('UPDATE products SET total_sales = total_sales + ? WHERE id = ?', [qty, id]);
    return this.findById(id);
  }

  async updateStock(id, qty) {
    await query('UPDATE products SET stock_quantity = ? WHERE id = ?', [qty, id]);
    return this.findById(id);
  }

  async updateRating(id, rating) {
    await query('UPDATE products SET rating = ? WHERE id = ?', [rating, id]);
    return this.findById(id);
  }

  async getFeatured(limit = 8) {
    return query(
      `SELECT p.*, c.name AS category_name,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.technician_id = u.id
       WHERE p.featured = 1 AND p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  async getByTechnician(technicianId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       WHERE p.technician_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [technicianId, limit, offset]
    );
    const countRow = await queryOne(
      'SELECT COUNT(*) AS total FROM products WHERE technician_id = ?',
      [technicianId]
    );
    return { products: rows, total: countRow.total, page, limit };
  }

  async countByTechnician(technicianId) {
    const row = await queryOne(
      'SELECT COUNT(*) AS total FROM products WHERE technician_id = ?',
      [technicianId]
    );
    return row.total;
  }

  async searchSuggestions(term) {
    const like = `%${term}%`;
    return query(
      `SELECT id, name, slug, price, discount_price, main_image
       FROM products
       WHERE status = 'active' AND (name LIKE ? OR description LIKE ?)
       ORDER BY total_sales DESC
       LIMIT 10`,
      [like, like]
    );
  }

  async getRelated(productId, categoryId, limit = 4) {
    return query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN product_categories c ON p.category_id = c.id
       WHERE p.id != ? AND p.category_id = ? AND p.status = 'active'
       ORDER BY RAND()
       LIMIT ?`,
      [productId, categoryId, limit]
    );
  }
}

module.exports = new ProductModel();
