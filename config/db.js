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
  try {
    await migrateMarketing(connection);
  } catch (err) {
    console.error('Marketing system migration failed:', err.message);
    throw err;
  }
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
           ADD COLUMN is_edited TINYINT(1) NOT NULL DEFAULT 0`
      );
      console.log('Migration: review system columns added');
    }
    const [uniqKey] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'uq_review_user_product'"
    );
    if (uniqKey[0].cnt === 0) {
      await connection.query(
        `DELETE r1 FROM reviews r1
         INNER JOIN reviews r2 ON r1.user_id = r2.user_id AND r1.product_id = r2.product_id AND r1.id < r2.id
         WHERE r1.product_id IS NOT NULL`
      );
      await connection.query(
        'ALTER TABLE reviews ADD UNIQUE KEY uq_review_user_product (user_id, product_id)'
      );
      console.log('Migration: added unique review user/product key');
    }
    const [orderIdx] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'idx_reviews_order'"
    );
    if (orderIdx[0].cnt === 0) {
      await connection.query('ALTER TABLE reviews ADD KEY idx_reviews_order (order_id)');
      console.log('Migration: added idx_reviews_order index');
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

/**
 * Marketing Officer module migration: adds the marketing_officer role to the
 * users ENUM, the is_promoted flag on products, activity/permission tables,
 * and all marketing content tables. Every step is guarded so it is idempotent.
 */
async function migrateMarketing(connection) {
  // 1. Add marketing_officer to the users.role ENUM
  const [roleCol] = await connection.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
  );
  if (roleCol[0] && !/marketing_officer/.test(roleCol[0].COLUMN_TYPE)) {
    const [enumRows] = await connection.query(
      "SELECT SUBSTRING(COLUMN_TYPE, 6, CHAR_LENGTH(COLUMN_TYPE) - 6) AS values_str FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
    );
    const existing = enumRows[0].values_str
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const newValues = [...existing, "'marketing_officer'"];
    await connection.query(
      `ALTER TABLE users MODIFY role ENUM(${newValues.join(',')}) NOT NULL DEFAULT 'customer'`
    );
    console.log('Migration: added marketing_officer role to users.role');
  }

  // 2. is_promoted flag on products (distinct from featured)
  const [promoCol] = await connection.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = (SELECT DATABASE()) AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_promoted'"
  );
  if (promoCol[0].cnt === 0) {
    await connection.query(
      "ALTER TABLE products ADD COLUMN is_promoted TINYINT(1) DEFAULT 0 AFTER featured"
    );
    await connection.query(
      "ALTER TABLE products ADD INDEX idx_products_promoted (is_promoted)"
    );
    console.log('Migration: added products.is_promoted column');
  }

  // 3. activity_logs
  await connection.query(
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      username VARCHAR(255) DEFAULT NULL,
      role VARCHAR(50) DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) DEFAULT NULL,
      resource_id INT DEFAULT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_alog_user (user_id),
      INDEX idx_alog_role (role),
      INDEX idx_alog_action (action),
      INDEX idx_alog_created (created_at)
    ) ENGINE=InnoDB`
  );

  // 4. role_permissions (default permission set per role)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(50) NOT NULL,
      permission VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_role_permission (role, permission)
    ) ENGINE=InnoDB`
  );

  // 5. user_permissions (per-user permission grants/revokes)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      permission VARCHAR(100) NOT NULL,
      granted TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_permission (user_id, permission),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`
  );

  // 5b. permissions (canonical RBAC catalog table)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      permission VARCHAR(100) NOT NULL UNIQUE,
      module VARCHAR(50) NOT NULL DEFAULT 'general',
      description VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`
  );

  // 6. marketing_campaigns
  await connection.query(
    `CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      goal VARCHAR(100) DEFAULT NULL,
      budget DECIMAL(10,2) DEFAULT NULL,
      status ENUM('draft','active','paused','completed','archived') NOT NULL DEFAULT 'draft',
      starts_at DATETIME NULL DEFAULT NULL,
      ends_at DATETIME NULL DEFAULT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_campaign_status (status),
      INDEX idx_campaign_created (created_at)
    ) ENGINE=InnoDB`
  );

  // 7. promotions (homepage banners + promotional sections)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255) DEFAULT NULL,
      type ENUM('banner','section') NOT NULL DEFAULT 'section',
      banner_image VARCHAR(500) DEFAULT NULL,
      link_url VARCHAR(500) DEFAULT NULL,
      sort_order INT DEFAULT 0,
      start_date DATE DEFAULT NULL,
      end_date DATE DEFAULT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_promo_type (type),
      INDEX idx_promo_status (status)
    ) ENGINE=InnoDB`
  );

  // 8. coupons
  await connection.query(
    `CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) DEFAULT NULL,
      type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
      value DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_order DECIMAL(10,2) DEFAULT NULL,
      max_uses INT DEFAULT NULL,
      used_count INT DEFAULT 0,
      starts_at DATETIME NULL DEFAULT NULL,
      expires_at DATETIME NULL DEFAULT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_coupon_status (status)
    ) ENGINE=InnoDB`
  );

  // 9. blog_posts
  await connection.query(
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      excerpt TEXT DEFAULT NULL,
      content LONGTEXT DEFAULT NULL,
      cover_image VARCHAR(500) DEFAULT NULL,
      status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
      published_at TIMESTAMP NULL DEFAULT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_blog_status (status),
      INDEX idx_blog_published (published_at)
    ) ENGINE=InnoDB`
  );

  // 10. announcements
  await connection.query(
    `CREATE TABLE IF NOT EXISTS announcements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_announce_status (status)
    ) ENGINE=InnoDB`
  );

  // 11. testimonials
  await connection.query(
    `CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      author_name VARCHAR(255) NOT NULL,
      author_role VARCHAR(255) DEFAULT NULL,
      content TEXT NOT NULL,
      rating INT DEFAULT 5,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_testimonial_status (status)
    ) ENGINE=InnoDB`
  );

  // 12. newsletter_subscribers
  await connection.query(
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      status ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sub_status (status)
    ) ENGINE=InnoDB`
  );

  // 13. newsletter_sends (promotional email log)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS newsletter_sends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subject VARCHAR(255) NOT NULL,
      body TEXT DEFAULT NULL,
      recipient_count INT DEFAULT 0,
      status ENUM('sent','draft','failed') NOT NULL DEFAULT 'sent',
      sent_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`
  );

  // 13b. website_visits (daily unique-visitor tracking for marketing analytics)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS website_visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      visit_date DATE NOT NULL,
      visitor_key VARCHAR(64) NOT NULL,
      page_path VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_visit (visit_date, visitor_key),
      INDEX idx_visit_date (visit_date)
    ) ENGINE=InnoDB`
  );

  // 14. Seed the RBAC permission catalog + default role permissions
  const {
    ALL_PERMISSIONS,
    ROLE_PERMISSIONS,
    PERMISSION_MODULES,
    LEGACY_PERMISSION_MAP
  } = require('./permissions');

  // 14a. Seed the canonical permissions catalog (idempotent).
  for (const module of PERMISSION_MODULES) {
    for (const permission of module.permissions) {
      await connection.query(
        'INSERT IGNORE INTO permissions (permission, module, description) VALUES (?, ?, NULL)',
        [permission, module.key]
      );
    }
  }

  // 14b. Migrate legacy namespaced permissions (marketing:*) to catalog names
  //      in both role_permissions and user_permissions. Each legacy row is
  //      first re-created under its modern name (INSERT IGNORE — safe against
  //      unique-key conflicts) and then deleted.
  for (const [legacy, modern] of Object.entries(LEGACY_PERMISSION_MAP)) {
    await connection.query(
      'INSERT IGNORE INTO role_permissions (role, permission) SELECT role, ? FROM role_permissions WHERE permission = ?',
      [modern, legacy]
    );
    await connection.query(
      'INSERT IGNORE INTO user_permissions (user_id, permission, granted) SELECT user_id, ?, granted FROM user_permissions WHERE permission = ?',
      [modern, legacy]
    );
    await connection.query(
      'DELETE FROM role_permissions WHERE permission = ?',
      [legacy]
    );
    await connection.query(
      'DELETE FROM user_permissions WHERE permission = ?',
      [legacy]
    );
  }

  // 14c. Delete any permission names no longer present in the catalog.
  const catalogPlaceholders = ALL_PERMISSIONS.map(() => '?').join(',');
  await connection.query(
    `DELETE FROM role_permissions WHERE permission NOT IN (${catalogPlaceholders})`,
    ALL_PERMISSIONS
  );
  await connection.query(
    `DELETE FROM user_permissions WHERE permission NOT IN (${catalogPlaceholders})`,
    ALL_PERMISSIONS
  );

  // 14d. Seed default permission sets for every role (idempotent).
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      await connection.query(
        'INSERT IGNORE INTO role_permissions (role, permission) VALUES (?, ?)',
        [role, permission]
      );
    }
  }
  console.log('Migration: RBAC permission catalog + role defaults ensured');
  console.log('Migration: marketing officer system ensured');
}

const whenReady = runMigrations();

module.exports = { pool, query, queryOne, testConnection, whenReady };
