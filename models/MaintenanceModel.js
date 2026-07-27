const pool = require('../config/db');

class MaintenanceModel {
  async getServicesByGroup(group) {
    const [rows] = await pool.execute('SELECT * FROM services WHERE category = ?', [group]);
    return rows;
  }

  async createBooking(data) {
    const [result] = await pool.execute(
      `INSERT INTO bookings (user_id, service_id, customer_name, customer_email, customer_phone, appointment_date, device_details, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [data.user_id || null, data.service_id, data.customer_name, data.customer_email, data.customer_phone, data.appointment_date, data.device_details]
    );
    return result.affectedRows > 0;
  }

  async getAllBookings() {
    const [rows] = await pool.execute('SELECT * FROM bookings ORDER BY appointment_date DESC');
    return rows;
  }

  async updateBookingStatus(id, status) {
    const [result] = await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  }
}

module.exports = new MaintenanceModel();
