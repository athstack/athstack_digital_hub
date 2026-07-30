const mysql = require('mysql2/promise');

const isServerless = process.env.VERCEL === '1';

const enableSsl = (process.env.DB_SSL || '').trim() === 'true';

const sslConfig = enableSsl
  ? { rejectUnauthorized: true }
  : undefined;

const host = process.env.DB_HOST || 'localhost';

const pool = mysql.createPool({
  host,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'athstack_digital_hub',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: isServerless ? 3 : 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true,
  ssl: sslConfig,
  enableKeepAlive: !isServerless,
  keepAliveInitialDelay: 0
});

/**
 * Test database connection
 * @returns {Promise<void>}
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
}

/**
 * Execute a query with optional parameters
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (err) {
    console.error('Query error:', err.message);
    throw err;
  }
}

/**
 * Get a single row from a query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|undefined>} Single row or undefined
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

async function runMigrations() {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'is_read_by_customer'"
    );
    if (rows[0].cnt === 0) {
      await pool.query("ALTER TABLE contact_messages ADD COLUMN is_read_by_customer TINYINT(1) NOT NULL DEFAULT 0 AFTER reply_text");
      console.log('Migration: added is_read_by_customer column');
    }
    try {
      const [jpgRows] = await pool.query("SELECT COUNT(*) AS cnt FROM products WHERE main_image LIKE '%.jpg'");
      if (jpgRows[0].cnt > 0) {
        await pool.query("UPDATE products SET main_image = REPLACE(main_image, '.jpg', '.svg') WHERE main_image LIKE '%.jpg'");
        console.log('Migration: updated product main_image extensions .jpg -> .svg (' + jpgRows[0].cnt + ' rows)');
      }
    } catch (err) {
      console.error('Product image migration failed:', err.message);
    }
  } catch (err) {
    console.error('Migration check failed:', err.message);
  }
}

runMigrations();

module.exports = { pool, query, queryOne, testConnection };
