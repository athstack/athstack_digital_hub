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
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'athstack_digital_hub',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        charset: 'utf8mb4',
        timezone: '+00:00',
        ssl: sslConfig,
        connectTimeout: 20000
      });
      await migrate(connection);
      console.log('Migration: complete');
      return;
    } catch (err) {
      console.error('Migration check failed:', err.message);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    } finally {
      if (connection) {
        try { await connection.end(); } catch (e) { /* ignore */ }
      }
    }
  }
}

async function migrate(connection) {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'is_read_by_customer'"
  );
  if (rows[0].cnt === 0) {
    await connection.query("ALTER TABLE contact_messages ADD COLUMN is_read_by_customer TINYINT(1) NOT NULL DEFAULT 0 AFTER reply_text");
    console.log('Migration: added is_read_by_customer column');
  }
  try {
    const [jpgRows] = await connection.query("SELECT COUNT(*) AS cnt FROM products WHERE main_image LIKE '%.jpg'");
    if (jpgRows[0].cnt > 0) {
      await connection.query("UPDATE products SET main_image = REPLACE(main_image, '.jpg', '.svg') WHERE main_image LIKE '%.jpg'");
      console.log('Migration: updated product main_image extensions .jpg -> .svg (' + jpgRows[0].cnt + ' rows)');
    }
  } catch (err) {
    console.error('Product image migration failed:', err.message);
  }

  try {
    const [reviewCols] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'title'"
    );
    if (reviewCols[0].cnt === 0) {
      await connection.query(
        `DELETE r1 FROM reviews r1
         INNER JOIN reviews r2 ON r1.user_id = r2.user_id AND r1.product_id = r2.product_id AND r1.id < r2.id
         WHERE r1.product_id IS NOT NULL`
      );
      await connection.query(
        `ALTER TABLE reviews
           ADD COLUMN order_id INT DEFAULT NULL,
           ADD COLUMN title VARCHAR(255) DEFAULT NULL,
           ADD COLUMN images JSON DEFAULT NULL,
           ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0,
           ADD COLUMN helpful_count INT NOT NULL DEFAULT 0,
           ADD COLUMN seller_reply TEXT DEFAULT NULL,
           ADD COLUMN seller_replied_at TIMESTAMP NULL DEFAULT NULL,
           ADD COLUMN seller_replied_by INT DEFAULT NULL,
           ADD COLUMN reported_count INT NOT NULL DEFAULT 0,
           ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0,
           ADD COLUMN is_edited TINYINT(1) NOT NULL DEFAULT 0,
           ADD UNIQUE KEY uq_review_user_product (user_id, product_id),
           ADD KEY idx_reviews_order (order_id)`
      );
      console.log('Migration: review system columns added');
    }
    await connection.query(
      `CREATE TABLE IF NOT EXISTS review_helpful_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_review_vote (review_id, user_id),
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS review_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        reason VARCHAR(255) NOT NULL,
        status ENUM('pending','resolved','dismissed') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_reports_status (status)
      ) ENGINE=InnoDB`
    );
    console.log('Migration: review system tables ensured');
  } catch (err) {
    console.error('Review system migration failed:', err.message);
    throw err;
  }
}

runMigrations();

module.exports = { pool, query, queryOne, testConnection };
