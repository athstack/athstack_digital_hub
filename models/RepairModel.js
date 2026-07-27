const { query, queryOne } = require('../config/db');

class RepairModel {
  async create(data) {
    const refNumber = `ATH-TK-${Date.now().toString(36).substring(2, 8).toUpperCase()}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const result = await query(
      `INSERT INTO repair_requests
       (user_id, service_id, reference_number, customer_name, customer_email, customer_phone,
        device_type, device_brand, device_model, device_serial, issue_description,
        appointment_date, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id || null, data.service_id || null, refNumber,
        data.customer_name, data.customer_email, data.customer_phone,
        data.device_type, data.device_brand || null, data.device_model || null,
        data.device_serial || null, data.issue_description,
        data.appointment_date || null, data.priority || 'medium'
      ]
    );

    return this.findById(result.insertId);
  }

  async findByReference(reference_number) {
    return queryOne(
      `SELECT rr.*, s.title AS service_title, s.base_price AS service_base_price,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       LEFT JOIN users u ON rr.technician_id = u.id
       WHERE rr.reference_number = ?`,
      [reference_number]
    );
  }

  async findById(id) {
    const repair = await queryOne(
      `SELECT rr.*, s.title AS service_title, s.slug AS service_slug, s.base_price AS service_base_price,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name,
              u.email AS technician_email, u.avatar AS technician_avatar
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       LEFT JOIN users u ON rr.technician_id = u.id
       WHERE rr.id = ?`,
      [id]
    );
    if (!repair) return null;

    repair.updates = await query(
      `SELECT ru.*, u.first_name AS updater_first_name, u.last_name AS updater_last_name
       FROM repair_updates ru
       LEFT JOIN users u ON ru.updated_by = u.id
       WHERE ru.repair_id = ?
       ORDER BY ru.created_at DESC`,
      [id]
    );

    return repair;
  }

  async getByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       WHERE rr.user_id = ?
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const countRow = await queryOne('SELECT COUNT(*) AS total FROM repair_requests WHERE user_id = ?', [userId]);
    return { repairs: rows, total: countRow.total, page, limit };
  }

  async countByUser(userId) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM repair_requests WHERE user_id = ?', [userId]);
    return row.total;
  }

  async getAll({ status, technician_id, page = 1, limit = 20 } = {}) {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('rr.status = ?');
      params.push(status);
    }
    if (technician_id) {
      conditions.push('rr.technician_id = ?');
      params.push(technician_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT rr.*, s.title AS service_title,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       LEFT JOIN users u ON rr.technician_id = u.id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM repair_requests rr
       ${where}`,
      params
    );

    return { repairs: rows, total: countRow.total, page, limit };
  }

  async getByTechnician(technicianId, page = 1, limit = 20, status) {
    const conditions = ['rr.technician_id = ?'];
    const params = [technicianId];

    if (status) {
      conditions.push('rr.status = ?');
      params.push(status);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT rr.*, s.title AS service_title
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM repair_requests rr ${where}`,
      params
    );

    return { repairs: rows, total: countRow.total, page, limit };
  }

  async countByTechnician(technicianId, status) {
    const conditions = ['technician_id = ?'];
    const params = [technicianId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const row = await queryOne(
      `SELECT COUNT(*) AS total FROM repair_requests WHERE ${conditions.join(' AND ')}`,
      params
    );
    return row.total;
  }

  async assignTechnician(repairId, technicianId) {
    await query(
      "UPDATE repair_requests SET technician_id = ?, status = 'assigned' WHERE id = ?",
      [technicianId, repairId]
    );
    return this.findById(repairId);
  }

  async updateStatus(repairId, status, notes, updatedBy) {
    await query(
      'UPDATE repair_requests SET status = ? WHERE id = ?',
      [status, repairId]
    );

    await query(
      'INSERT INTO repair_updates (repair_id, updated_by, status, notes) VALUES (?, ?, ?, ?)',
      [repairId, updatedBy || null, status, notes || null]
    );

    return this.findById(repairId);
  }

  async addUpdate(repairId, { status, notes, image_path, updated_by }) {
    await query(
      'INSERT INTO repair_updates (repair_id, updated_by, status, notes, image_path) VALUES (?, ?, ?, ?, ?)',
      [repairId, updated_by || null, status, notes || null, image_path || null]
    );
    return this.getTimeline(repairId);
  }

  async getTimeline(repairId) {
    return query(
      `SELECT ru.*, u.first_name AS updater_first_name, u.last_name AS updater_last_name
       FROM repair_updates ru
       LEFT JOIN users u ON ru.updated_by = u.id
       WHERE ru.repair_id = ?
       ORDER BY ru.created_at ASC`,
      [repairId]
    );
  }

  async updateCost(repairId, { estimated_cost, actual_cost }) {
    const sets = [];
    const params = [];

    if (estimated_cost !== undefined) { sets.push('estimated_cost = ?'); params.push(estimated_cost); }
    if (actual_cost !== undefined) { sets.push('actual_cost = ?'); params.push(actual_cost); }

    if (sets.length === 0) return this.findById(repairId);

    params.push(repairId);
    await query(`UPDATE repair_requests SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(repairId);
  }

  async getStats() {
    const rows = await query(
      "SELECT status, COUNT(*) AS count FROM repair_requests GROUP BY status ORDER BY FIELD(status, 'pending','assigned','diagnosing','in_repair','awaiting_parts','completed','cancelled')"
    );
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return { statuses: rows, total };
  }

  async getRecent(limit = 10) {
    return query(
      `SELECT rr.*, s.title AS service_title,
              u.first_name AS technician_first_name, u.last_name AS technician_last_name
       FROM repair_requests rr
       LEFT JOIN services s ON rr.service_id = s.id
       LEFT JOIN users u ON rr.technician_id = u.id
       ORDER BY rr.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }
}

module.exports = new RepairModel();
