const mysql = require('mysql2/promise');

const isServerless = process.env.VERCEL === '1';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'athstack_digital_hub',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: isServerless ? 3 : 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true,
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
    const [results] = await pool.execute(sql, params);
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

module.exports = { pool, query, queryOne, testConnection };
