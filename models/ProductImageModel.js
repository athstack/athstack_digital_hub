const { query, queryOne } = require('../config/db');

class ProductImageModel {
  async getByProduct(productId) {
    return query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [productId]
    );
  }

  async add(productId, imagePath, sortOrder = 0) {
    const result = await query(
      'INSERT INTO product_images (product_id, image_path, sort_order) VALUES (?, ?, ?)',
      [productId, imagePath, sortOrder]
    );
    return queryOne('SELECT * FROM product_images WHERE id = ?', [result.insertId]);
  }

  async addMultiple(productId, imagePaths) {
    const results = [];
    for (let i = 0; i < imagePaths.length; i++) {
      const img = await this.add(productId, imagePaths[i], i);
      results.push(img);
    }
    return results;
  }

  async delete(id) {
    await query('DELETE FROM product_images WHERE id = ?', [id]);
    return true;
  }

  async deleteByProduct(productId) {
    await query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    return true;
  }

  async deleteOldest(productId, keepCount) {
    const images = await this.getByProduct(productId);
    if (images.length <= keepCount) return;
    const toDelete = images.slice(0, images.length - keepCount);
    for (const img of toDelete) {
      await this.delete(img.id);
    }
  }
}

module.exports = new ProductImageModel();
