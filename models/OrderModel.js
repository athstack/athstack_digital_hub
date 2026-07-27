const pool = require('../config/db');

class OrderModel {
  async getUserOrders(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }
}

module.exports = new OrderModel();
