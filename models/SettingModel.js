const { query, queryOne } = require('../config/db');

class SettingModel {
  async get(key) {
    const row = await queryOne('SELECT * FROM settings WHERE setting_key = ?', [key]);
    return row ? row.setting_value : null;
  }

  async getGroup(group) {
    const rows = await query(
      'SELECT * FROM settings WHERE setting_group = ? ORDER BY setting_key ASC',
      [group]
    );
    const result = {};
    for (const row of rows) {
      result[row.setting_key] = row.setting_value;
    }
    return result;
  }

  async set(key, value) {
    await query(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value]
    );
    return true;
  }

  async setGroup(settings, group = 'general') {
    const connection = require('../config/db').pool;
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      for (const [key, value] of Object.entries(settings)) {
        await conn.execute(
          `INSERT INTO settings (setting_key, setting_value, setting_group)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_group = VALUES(setting_group)`,
          [key, value, group]
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new SettingModel();
