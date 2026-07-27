const { query, queryOne, pool } = require('../config/db');

class OrderModel {
  async create(userId, { total_amount, shipping_address, payment_method = 'cod', items = [] }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const orderRef = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const [orderResult] = await connection.execute(
        'INSERT INTO orders (user_id, order_reference, total_amount, shipping_address, payment_method) VALUES (?, ?, ?, ?, ?)',
        [userId, orderRef, total_amount, shipping_address, payment_method]
      );
      const orderId = orderResult.insertId;

      for (const item of items) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, technician_id, product_name, product_image, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.technician_id || null, item.product_name, item.product_image || null, item.quantity, item.unit_price, item.total_price]
        );

        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ?, total_sales = total_sales + ? WHERE id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      }

      await connection.commit();

      return this.findById(orderId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async findByReference(ref) {
    const order = await queryOne(
      `SELECT o.*, u.first_name, u.last_name, u.email, u.phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.order_reference = ?`,
      [ref]
    );
    if (!order) return null;

    order.items = await query(
      `SELECT oi.*, p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    return order;
  }

  async findById(id) {
    const order = await queryOne(
      `SELECT o.*, u.first_name, u.last_name, u.email, u.phone
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    if (!order) return null;

    order.items = await query(
      `SELECT oi.*, p.slug AS product_slug
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    return order;
  }

  async getByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    const countRow = await queryOne('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]);
    return { orders: rows, total: countRow.total, page, limit };
  }

  async countByUser(userId) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId]);
    return row.total;
  }

  async getAll({ status, page = 1, limit = 20, technician_id } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('o.order_status = ?');
      params.push(status);
    }
    if (technician_id) {
      conditions.push('o.id IN (SELECT order_id FROM order_items WHERE technician_id = ?)');
      params.push(technician_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM orders o
       ${where}`,
      params
    );

    return { orders: rows, total: countRow.total, page, limit };
  }

  async updateStatus(id, order_status) {
    await query('UPDATE orders SET order_status = ? WHERE id = ?', [order_status, id]);
    return this.findById(id);
  }

  async updatePaymentStatus(id, payment_status) {
    await query('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);
    return this.findById(id);
  }

  async getByTechnician(technicianId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT DISTINCT o.*, u.first_name, u.last_name
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE oi.technician_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [technicianId, limit, offset]
    );
    const countRow = await queryOne(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.technician_id = ?`,
      [technicianId]
    );
    return { orders: rows, total: countRow.total, page, limit };
  }

  async countByTechnician(technicianId) {
    const row = await queryOne(
      `SELECT COUNT(DISTINCT o.id) AS total
       FROM orders o
       INNER JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.technician_id = ?`,
      [technicianId]
    );
    return row.total;
  }

  async getRevenue({ start_date, end_date } = {}) {
    const conditions = [];
    const params = [];

    if (start_date) {
      conditions.push('created_at >= ?');
      params.push(start_date);
    }
    if (end_date) {
      conditions.push('created_at <= ?');
      params.push(end_date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const row = await queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS total_orders
       FROM orders
       ${where}`,
      params
    );
    return row;
  }

  async getRecentOrders(limit = 10) {
    return query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }
}

module.exports = new OrderModel();
