const { query, queryOne, pool } = require('../config/db');

const MAX_REVIEW_IMAGES = 5;
const COMMENT_MIN = 20;
const COMMENT_MAX = 1500;
const TITLE_MAX = 120;

const statsCache = new Map();
const STATS_TTL = 60 * 1000;

function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function invalidateStats(productId) {
  if (productId) statsCache.delete(`product_${productId}`);
}

const PRODUCT_SELECT =
  'r.*, u.first_name, u.last_name, u.avatar';

class ReviewModel {
  async create({ user_id, product_id, order_id, title, rating, comment, images, type, status, is_verified }) {
    const reviewStatus = status || 'pending';
    const result = await query(
      `INSERT INTO reviews (user_id, product_id, order_id, title, rating, comment, images, is_verified, type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        product_id || null,
        order_id || null,
        title || null,
        rating,
        comment || null,
        images && images.length ? JSON.stringify(images) : null,
        is_verified ? 1 : 0,
        type || 'product',
        reviewStatus
      ]
    );
    invalidateStats(product_id);
    const review = await queryOne('SELECT * FROM reviews WHERE id = ?', [result.insertId]);
    return this.normalize(review);
  }

  normalize(review) {
    if (!review) return null;
    review.images = parseImages(review.images);
    review.is_verified = !!review.is_verified;
    review.is_hidden = !!review.is_hidden;
    review.is_edited = !!review.is_edited;
    return review;
  }

  getStatsKey(productId) {
    return `product_${productId}`;
  }

  async getProductStats(productId, { useCache = true } = {}) {
    const key = this.getStatsKey(productId);
    if (useCache) {
      const cached = statsCache.get(key);
      if (cached && Date.now() - cached.timestamp < STATS_TTL) {
        return cached.data;
      }
    }

    const row = await queryOne(
      `SELECT
         COALESCE(AVG(rating), 0) AS average_rating,
         COUNT(*) AS total_reviews,
         SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS r5,
         SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS r4,
         SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS r3,
         SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS r2,
         SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS r1,
         SUM(is_verified) AS verified_count,
         SUM(CASE WHEN images IS NOT NULL AND JSON_LENGTH(images) > 0 THEN 1 ELSE 0 END) AS photo_count
       FROM reviews
       WHERE product_id = ? AND status = 'approved' AND is_hidden = 0`,
      [productId]
    );

    const data = {
      average: parseFloat(row.average_rating || 0),
      count: row.total_reviews || 0,
      distribution: {
        5: row.r5 || 0, 4: row.r4 || 0, 3: row.r3 || 0, 2: row.r2 || 0, 1: row.r1 || 0
      },
      verifiedCount: row.verified_count || 0,
      photoCount: row.photo_count || 0
    };
    statsCache.set(key, { timestamp: Date.now(), data });
    return data;
  }

  async getByProduct(productId, { page = 1, limit = 5, sort = 'recent', rating = null, hasPhotos = false, isVerified = false, search = null, userId = null } = {}) {
    const offset = (page - 1) * limit;
    const conditions = ['r.product_id = ?', "r.status = 'approved'", 'r.is_hidden = 0'];
    const filterParams = [];

    if (rating && rating >= 1 && rating <= 5) {
      conditions.push('r.rating = ?');
      filterParams.push(rating);
    }
    if (hasPhotos) {
      conditions.push('r.images IS NOT NULL AND JSON_LENGTH(r.images) > 0');
    }
    if (isVerified) {
      conditions.push('r.is_verified = 1');
    }
    if (search) {
      conditions.push('(r.comment LIKE ? OR r.title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
      const term = `%${search}%`;
      filterParams.push(term, term, term, term);
    }

    const where = conditions.join(' AND ');
    let orderBy = 'r.created_at DESC';
    if (sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
    else if (sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';
    else if (sort === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';

    const listParams = [userId || 0, productId, ...filterParams, limit, offset];
    const countParams = [productId, ...filterParams];

    const rows = await query(
      `SELECT ${PRODUCT_SELECT},
              (SELECT COUNT(*) FROM review_helpful_votes hv WHERE hv.review_id = r.id AND hv.user_id = ?) AS user_voted
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      listParams
    );

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE ${where}`,
      countParams
    );

    const reviews = rows.map(r => this.normalize(r));
    return { reviews, total: countRow.total, page, limit, hasMore: page * limit < countRow.total };
  }

  async getPhotoGallery(productId, limit = 24) {
    const rows = await query(
      `SELECT r.id, r.rating, r.created_at, r.images,
              u.first_name, u.last_name, u.avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'approved' AND r.is_hidden = 0
         AND r.images IS NOT NULL AND JSON_LENGTH(r.images) > 0
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [productId, limit]
    );

    const gallery = [];
    for (const row of rows) {
      const images = parseImages(row.images);
      for (const url of images) {
        gallery.push({
          reviewId: row.id,
          url,
          rating: row.rating,
          author: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Customer',
          avatar: row.avatar,
          date: row.created_at
        });
      }
    }
    return gallery;
  }

  async getEligibilityForProduct(userId, productId) {
    const order = await queryOne(
      `SELECT o.id AS order_id, o.order_reference, o.updated_at AS delivered_at
       FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ? AND o.order_status = 'delivered' AND oi.product_id = ?
       ORDER BY o.updated_at DESC
       LIMIT 1`,
      [userId, productId]
    );
    const ownReview = await queryOne(
      'SELECT * FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return {
      hasPurchased: !!order,
      order: order ? { id: order.order_id, reference: order.order_reference } : null,
      hasReviewed: !!ownReview,
      review: ownReview ? this.normalize(ownReview) : null
    };
  }

  async getEligibleProducts(userId) {
    const rows = await query(
      `SELECT oi.product_id, oi.product_name, oi.product_image, oi.order_id, oi.quantity,
              o.order_reference, p.slug AS product_slug, o.updated_at AS delivered_at
       FROM order_items oi
       INNER JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = ? AND o.order_status = 'delivered' AND oi.product_id IS NOT NULL
         AND oi.product_id NOT IN (
           SELECT product_id FROM reviews WHERE user_id = ? AND product_id IS NOT NULL
         )
       ORDER BY o.updated_at DESC`,
      [userId, userId]
    );
    const seen = new Set();
    return rows.filter(item => {
      if (seen.has(item.product_id)) return false;
      seen.add(item.product_id);
      return true;
    });
  }

  async getByUser(userId) {
    const rows = await query(
      `SELECT r.*,
              p.name AS product_name, p.slug AS product_slug, p.main_image AS product_image
       FROM reviews r
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return rows.map(r => this.normalize(r));
  }

  async getOwnedById(userId, reviewId) {
    const review = await queryOne('SELECT * FROM reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);
    return review ? this.normalize(review) : null;
  }

  async updateCustomer(id, userId, { rating, title, comment, images }) {
    await pool.execute(
      `UPDATE reviews
       SET rating = ?, title = ?, comment = ?, images = ?, is_edited = 1
       WHERE id = ? AND user_id = ?`,
      [rating, title || null, comment, images && images.length ? JSON.stringify(images) : null, id, userId]
    );
    const review = await this.getOwnedById(userId, id);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async updateProductRating(productId) {
    const row = await queryOne(
      `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS total
       FROM reviews WHERE product_id = ? AND status = 'approved' AND is_hidden = 0`,
      [productId]
    );
    await pool.execute('UPDATE products SET rating = ? WHERE id = ?', [parseFloat(row.average || 0), productId]);
    invalidateStats(productId);
    return { average: parseFloat(row.average || 0), count: row.total };
  }

  async getByTechnician(technicianId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT ${PRODUCT_SELECT}
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.technician_id = ? AND r.status = 'approved' AND r.is_hidden = 0
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [technicianId, limit, offset]
    );
    const countRow = await queryOne(
      "SELECT COUNT(*) AS total FROM reviews WHERE technician_id = ? AND status = 'approved' AND is_hidden = 0",
      [technicianId]
    );
    return { reviews: rows.map(r => this.normalize(r)), total: countRow.total, page, limit };
  }

  async toggleHelpful(reviewId, userId) {
    const existing = await queryOne(
      'SELECT id FROM review_helpful_votes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );
    if (existing) {
      await pool.execute('DELETE FROM review_helpful_votes WHERE id = ?', [existing.id]);
      await pool.execute('UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = ?', [reviewId]);
    } else {
      await pool.execute('INSERT INTO review_helpful_votes (review_id, user_id) VALUES (?, ?)', [reviewId, userId]);
      await pool.execute('UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?', [reviewId]);
    }
    const row = await queryOne('SELECT helpful_count FROM reviews WHERE id = ?', [reviewId]);
    return { helpful: !existing, count: row ? row.helpful_count : 0 };
  }

  async hasUserVoted(reviewId, userId) {
    if (!userId) return false;
    const row = await queryOne(
      'SELECT id FROM review_helpful_votes WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );
    return !!row;
  }

  async report(reviewId, userId, reason) {
    await pool.execute(
      'INSERT INTO review_reports (review_id, user_id, reason) VALUES (?, ?, ?)',
      [reviewId, userId || null, reason || 'Reported']
    );
    await pool.execute('UPDATE reviews SET reported_count = reported_count + 1 WHERE id = ?', [reviewId]);
    return true;
  }

  async sellerReply(reviewId, adminId, reply) {
    await pool.execute(
      `UPDATE reviews
       SET seller_reply = ?, seller_replied_at = CURRENT_TIMESTAMP, seller_replied_by = ?
       WHERE id = ?`,
      [reply, adminId, reviewId]
    );
    const review = await this.getById(reviewId);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async getAllAdmin({ status, search, reported, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }
    if (reported) {
      conditions.push('r.reported_count > 0');
    }
    if (search) {
      conditions.push(
        '(r.comment LIKE ? OR r.title LIKE ? OR p.name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)'
      );
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT r.*,
              u.first_name, u.last_name, u.email,
              p.name AS product_name, p.slug AS product_slug,
              au.first_name AS approver_first_name, au.last_name AS approver_last_name,
              (SELECT COUNT(*) FROM review_reports rr WHERE rr.review_id = r.id AND rr.status = 'pending') AS pending_reports
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       LEFT JOIN users au ON r.approved_by = au.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ${where}`,
      params
    );
    return { reviews: rows.map(r => this.normalize(r)), total: countRow.total, page, limit };
  }

  async getById(id) {
    const review = await queryOne(
      `SELECT r.*, u.first_name, u.last_name, u.email, p.name AS product_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE r.id = ?`,
      [id]
    );
    return review ? this.normalize(review) : null;
  }

  async getPendingCount() {
    const row = await queryOne("SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'");
    return row.total;
  }

  async getReportedCount() {
    const row = await queryOne('SELECT COUNT(*) AS total FROM reviews WHERE reported_count > 0');
    return row.total;
  }

  async getOpenReports(limit = 50) {
    return query(
      `SELECT rr.id AS report_id, rr.reason, rr.created_at AS report_created_at, rr.status AS report_status,
              r.id AS review_id, r.rating, r.comment, r.title, r.reported_count, r.status AS review_status,
              u.first_name, u.last_name, u.email AS reporter_email,
              ru.first_name AS reviewer_first_name, ru.last_name AS reviewer_last_name,
              p.name AS product_name, p.slug AS product_slug
       FROM review_reports rr
       LEFT JOIN reviews r ON rr.review_id = r.id
       LEFT JOIN users u ON rr.user_id = u.id
       LEFT JOIN users ru ON r.user_id = ru.id
       LEFT JOIN products p ON r.product_id = p.id
       WHERE rr.status = 'pending'
       ORDER BY rr.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

  async resolveReport(reportId, action) {
    const report = await queryOne('SELECT * FROM review_reports WHERE id = ?', [reportId]);
    if (!report) return false;
    await pool.execute('UPDATE review_reports SET status = ? WHERE id = ?', [action, reportId]);
    await pool.execute('UPDATE reviews SET reported_count = GREATEST(reported_count - 1, 0) WHERE id = ?', [report.review_id]);
    return true;
  }

  async approve(id, adminId) {
    await query(
      "UPDATE reviews SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?, is_hidden = 0 WHERE id = ?",
      [adminId, id]
    );
    const review = await this.getById(id);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async reject(id, adminId) {
    await query(
      "UPDATE reviews SET status = 'rejected', approved_by = ? WHERE id = ?",
      [adminId, id]
    );
    const review = await this.getById(id);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async toggleHidden(id) {
    await pool.execute('UPDATE reviews SET is_hidden = 1 - is_hidden WHERE id = ?', [id]);
    const review = await this.getById(id);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async update(id, fields) {
    const { rating, comment, title, status, is_verified } = fields;
    await pool.execute(
      `UPDATE reviews SET rating = ?, comment = ?, title = ?, status = ?, is_verified = ? WHERE id = ?`,
      [rating, comment, title || null, status || 'pending', is_verified ? 1 : 0, id]
    );
    const review = await this.getById(id);
    if (review) invalidateStats(review.product_id);
    return review;
  }

  async delete(id) {
    const review = await this.getById(id);
    await query('DELETE FROM reviews WHERE id = ?', [id]);
    if (review && review.product_id) invalidateStats(review.product_id);
    return review;
  }

  async getAverageRating(productId) {
    const row = await queryOne(
      "SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS total_reviews FROM reviews WHERE product_id = ? AND status = 'approved' AND is_hidden = 0",
      [productId]
    );
    return { average: parseFloat(row.average_rating), count: row.total_reviews };
  }
}

const singleton = new ReviewModel();
singleton.ReviewModel = ReviewModel;
singleton.MAX_REVIEW_IMAGES = MAX_REVIEW_IMAGES;
singleton.COMMENT_MIN = COMMENT_MIN;
singleton.COMMENT_MAX = COMMENT_MAX;
singleton.TITLE_MAX = TITLE_MAX;

module.exports = singleton;
