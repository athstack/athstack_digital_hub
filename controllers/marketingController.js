const { pool } = require('../config/db');
const UserModel = require('../models/UserModel');
const SettingModel = require('../models/SettingModel');
const { generateSlug } = require('../utils/helpers');
const { logActivity } = require('../helpers/activityLog');

const PERMISSIONS = {
  dashboard: 'marketing:dashboard',
  campaigns: 'marketing:campaigns',
  promotions: 'marketing:promotions',
  coupons: 'marketing:coupons',
  banners: 'marketing:banners',
  blog: 'marketing:blog',
  testimonials: 'marketing:testimonials',
  announcements: 'marketing:announcements',
  reviews: 'marketing:reviews',
  feedback: 'marketing:feedback',
  newsletters: 'marketing:newsletters',
  featured_products: 'marketing:featured_products',
  analytics: 'marketing:analytics',
  reports: 'marketing:reports',
  profile: 'marketing:profile',
  settings: 'marketing:settings'
};

function pageInfo(req) {
  const pathname = req.originalUrl.split('?')[0];
  const segments = pathname.split('/').filter(Boolean);
  let activeSection = segments[1] || 'dashboard';
  if (segments[1] === 'analytics') {
    if (segments[2] === 'products') activeSection = 'product-performance';
    else if (segments[2] === 'campaigns') activeSection = 'campaign-analytics';
  }
  return {
    currentPath: pathname,
    activeSection
  };
}

async function countActiveCampaigns() {
  const [row] = await pool.execute(
    "SELECT COUNT(*) AS count FROM marketing_campaigns WHERE status = 'active'"
  );
  return row[0].count;
}

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const [campaigns] = await pool.execute('SELECT COUNT(*) AS count FROM marketing_campaigns');
    const [activeCampaigns] = await pool.execute("SELECT COUNT(*) AS count FROM marketing_campaigns WHERE status = 'active'");
    const [promotions] = await pool.execute("SELECT COUNT(*) AS count FROM promotions WHERE status = 'active' AND type = 'section'");
    const [featured] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE featured = 1');
    const [promoted] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE is_promoted = 1');
    const [coupons] = await pool.execute("SELECT COUNT(*) AS count FROM coupons WHERE status = 'active'");
    const [visitors30] = await pool.execute(
      'SELECT COUNT(DISTINCT visitor_key) AS count FROM website_visits WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    );
    const [sales30] = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [orders30] = await pool.execute(
      "SELECT COUNT(*) AS count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [reviews] = await pool.execute('SELECT COUNT(*) AS count FROM reviews');
    const [blog] = await pool.execute("SELECT COUNT(*) AS count FROM blog_posts WHERE status = 'published'");
    const [subscribers] = await pool.execute("SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE status = 'subscribed'");
    const [upcoming] = await pool.execute(
      "SELECT * FROM promotions WHERE status = 'active' AND type = 'section' AND end_date >= CURDATE() ORDER BY start_date ASC LIMIT 5"
    );
    const [recentCampaigns] = await pool.execute(
      'SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT 5'
    );
    const [activities] = await pool.execute(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 8',
      [userId]
    );
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 6',
      [userId]
    );
    const [visitsSeries] = await pool.execute(
      `SELECT visit_date, COUNT(DISTINCT visitor_key) AS visitors
       FROM website_visits
       WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY visit_date ORDER BY visit_date ASC`
    );
    const [ordersSeries] = await pool.execute(
      `SELECT DATE(created_at) AS d, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at) ORDER BY d ASC`
    );

    const visitors = visitors30[0].count;
    const conversionRate = visitors > 0 ? ((orders30[0].count / visitors) * 100).toFixed(1) : '0.0';

    const chartLabels = [];
    const chartVisitors = [];
    const chartOrders = [];
    const chartRevenue = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chartLabels.push(key);
      const v = visitsSeries.find((r) => new Date(r.visit_date).toISOString().slice(0, 10) === key);
      chartVisitors.push(v ? v.visitors : 0);
      const o = ordersSeries.find((r) => new Date(r.d).toISOString().slice(0, 10) === key);
      chartOrders.push(o ? o.orders : 0);
      chartRevenue.push(o ? Number(o.revenue) : 0);
    }

    const metrics = {
      total_campaigns: campaigns[0].count,
      active_campaigns: activeCampaigns[0].count,
      active_promotions: promotions[0].count,
      featured_products: featured[0].count,
      promoted_products: promoted[0].count,
      active_coupons: coupons[0].count,
      visitors: visitors30[0].count,
      conversion_rate: conversionRate,
      sales_generated: sales30[0].total,
      customer_reviews: reviews[0].count,
      blog_posts: blog[0].count,
      subscribers: subscribers[0].count
    };

    res.render('marketing/dashboard', {
      title: req.t('marketing:title.dashboard'),
      metrics,
      upcomingPromotions: upcoming,
      recentCampaigns,
      recentActivities: activities,
      recentNotifications: notifications,
      chartLabels: JSON.stringify(chartLabels),
      chartVisitors: JSON.stringify(chartVisitors),
      chartOrders: JSON.stringify(chartOrders),
      chartRevenue: JSON.stringify(chartRevenue),
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

exports.getCampaigns = async (req, res, next) => {
  try {
    const status = req.query.status || null;
    const search = req.query.search || null;
    let sql = 'SELECT * FROM marketing_campaigns';
    const where = [];
    const params = [];
    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }
    if (search) {
      where.push('(title LIKE ? OR goal LIKE ?)');
      const term = '%' + search + '%';
      params.push(term, term);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const [campaigns] = await pool.execute(sql, params);
    res.render('marketing/campaigns', {
      title: req.t('marketing:title.campaigns'),
      campaigns,
      currentStatus: status || 'all',
      searchQuery: search || '',
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getCampaignForm = async (req, res, next) => {
  try {
    let campaign = null;
    let editing = false;
    if (req.params.id) {
      const [rows] = await pool.execute('SELECT * FROM marketing_campaigns WHERE id = ?', [parseInt(req.params.id)]);
      campaign = rows[0] || null;
      if (!campaign) {
        req.flash('error', req.t('marketing:flash.campaignNotFound'));
        return res.redirect('/marketing/campaigns');
      }
      editing = true;
    }
    res.render('marketing/campaign-form', {
      title: editing ? req.t('marketing:title.editCampaign') : req.t('marketing:title.newCampaign'),
      campaign,
      editing,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createCampaign = async (req, res, next) => {
  try {
    const { title, description, goal, budget, starts_at, ends_at } = req.body;
    if (!title) {
      req.flash('error', req.t('marketing:flash.campaignRequiredFields'));
      return res.redirect('/marketing/campaigns/new');
    }
    let slug = generateSlug(title);
    const [existing] = await pool.execute('SELECT id FROM marketing_campaigns WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      slug = slug + '-' + Date.now().toString(36);
    }
    const [result] = await pool.execute(
      'INSERT INTO marketing_campaigns (title, slug, description, goal, budget, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, description || null, goal || null, budget || null, starts_at || null, ends_at || null, req.session.userId]
    );
    await logActivity(req, 'create', 'campaign', result.insertId);
    req.flash('success', req.t('marketing:flash.campaignCreated'));
    res.redirect('/marketing/campaigns');
  } catch (err) {
    next(err);
  }
};

exports.updateCampaign = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, goal, budget, starts_at, ends_at, status } = req.body;
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
    const newStatus = validStatuses.includes(status) ? status : 'draft';
    if (!title) {
      req.flash('error', req.t('marketing:flash.campaignRequiredFields'));
      return res.redirect('/marketing/campaigns/' + id + '/edit');
    }
    const [result] = await pool.execute(
      'UPDATE marketing_campaigns SET title = ?, description = ?, goal = ?, budget = ?, starts_at = ?, ends_at = ?, status = ? WHERE id = ?',
      [title, description || null, goal || null, budget || null, starts_at || null, ends_at || null, newStatus, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.campaignNotFound'));
      return res.redirect('/marketing/campaigns');
    }
    await logActivity(req, 'update', 'campaign', id);
    req.flash('success', req.t('marketing:flash.campaignUpdated'));
    res.redirect('/marketing/campaigns');
  } catch (err) {
    next(err);
  }
};

exports.updateCampaignStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
    if (!validStatuses.includes(status)) {
      req.flash('error', req.t('marketing:flash.invalidStatus'));
      return res.redirect('/marketing/campaigns');
    }
    const [result] = await pool.execute('UPDATE marketing_campaigns SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.campaignNotFound'));
      return res.redirect('/marketing/campaigns');
    }
    await logActivity(req, status, 'campaign', id);
    req.flash('success', req.t('marketing:flash.campaignStatusUpdated'));
    res.redirect('/marketing/campaigns');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Promotions (promotional sections)
// ---------------------------------------------------------------------------

exports.getPromotions = async (req, res, next) => {
  try {
    const [promotions] = await pool.execute(
      "SELECT * FROM promotions WHERE type = 'section' ORDER BY sort_order ASC, created_at DESC"
    );
    res.render('marketing/promotions', {
      title: req.t('marketing:title.promotions'),
      promotions,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getPromotionForm = async (req, res, next) => {
  try {
    let promotion = null;
    let editing = false;
    if (req.params.id) {
      const [rows] = await pool.execute('SELECT * FROM promotions WHERE id = ?', [parseInt(req.params.id)]);
      promotion = rows[0] || null;
      if (!promotion) {
        req.flash('error', req.t('marketing:flash.promotionNotFound'));
        return res.redirect('/marketing/promotions');
      }
      editing = true;
    }
    res.render('marketing/promotion-form', {
      title: editing ? req.t('marketing:title.editPromotion') : req.t('marketing:title.newPromotion'),
      promotion,
      editing,
      type: 'section',
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createPromotion = async (req, res, next) => {
  try {
    const { title, subtitle, link_url, sort_order, start_date, end_date } = req.body;
    if (!title) {
      req.flash('error', req.t('marketing:flash.promotionRequiredFields'));
      return res.redirect('/marketing/promotions/new');
    }
    const [result] = await pool.execute(
      'INSERT INTO promotions (title, subtitle, type, link_url, sort_order, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, subtitle || null, 'section', link_url || null, parseInt(sort_order) || 0, start_date || null, end_date || null, req.session.userId]
    );
    await logActivity(req, 'create', 'promotion', result.insertId);
    req.flash('success', req.t('marketing:flash.promotionCreated'));
    res.redirect('/marketing/promotions');
  } catch (err) {
    next(err);
  }
};

exports.updatePromotion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, subtitle, link_url, sort_order, start_date, end_date, status } = req.body;
    const newStatus = status === 'inactive' ? 'inactive' : 'active';
    if (!title) {
      req.flash('error', req.t('marketing:flash.promotionRequiredFields'));
      return res.redirect('/marketing/promotions/' + id + '/edit');
    }
    const [result] = await pool.execute(
      'UPDATE promotions SET title = ?, subtitle = ?, link_url = ?, sort_order = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?',
      [title, subtitle || null, link_url || null, parseInt(sort_order) || 0, start_date || null, end_date || null, newStatus, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.promotionNotFound'));
      return res.redirect('/marketing/promotions');
    }
    await logActivity(req, 'update', 'promotion', id);
    req.flash('success', req.t('marketing:flash.promotionUpdated'));
    res.redirect('/marketing/promotions');
  } catch (err) {
    next(err);
  }
};

exports.updatePromotionStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM promotions WHERE id = ?', [id]);
    const promo = rows[0];
    if (!promo) {
      req.flash('error', req.t('marketing:flash.promotionNotFound'));
      return res.redirect('/marketing/promotions');
    }
    const newStatus = promo.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE promotions SET status = ? WHERE id = ?', [newStatus, id]);
    await logActivity(req, newStatus === 'active' ? 'activate' : 'deactivate', 'promotion', id);
    req.flash('success', req.t('marketing:flash.promotionStatusUpdated'));
    res.redirect('/marketing/promotions');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Homepage banners
// ---------------------------------------------------------------------------

exports.getBanners = async (req, res, next) => {
  try {
    const [banners] = await pool.execute(
      "SELECT * FROM promotions WHERE type = 'banner' ORDER BY sort_order ASC, created_at DESC"
    );
    res.render('marketing/banners', {
      title: req.t('marketing:title.banners'),
      banners,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getBannerForm = async (req, res, next) => {
  try {
    let banner = null;
    let editing = false;
    if (req.params.id) {
      const [rows] = await pool.execute('SELECT * FROM promotions WHERE id = ?', [parseInt(req.params.id)]);
      banner = rows[0] || null;
      if (!banner || banner.type !== 'banner') {
        req.flash('error', req.t('marketing:flash.bannerNotFound'));
        return res.redirect('/marketing/banners');
      }
      editing = true;
    }
    res.render('marketing/banner-form', {
      title: editing ? req.t('marketing:title.editBanner') : req.t('marketing:title.newBanner'),
      banner,
      editing,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, banner_image, link_url, sort_order, start_date, end_date } = req.body;
    if (!title) {
      req.flash('error', req.t('marketing:flash.bannerRequiredFields'));
      return res.redirect('/marketing/banners/new');
    }
    const [result] = await pool.execute(
      'INSERT INTO promotions (title, subtitle, type, banner_image, link_url, sort_order, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, subtitle || null, 'banner', banner_image || null, link_url || null, parseInt(sort_order) || 0, start_date || null, end_date || null, req.session.userId]
    );
    await logActivity(req, 'create', 'banner', result.insertId);
    req.flash('success', req.t('marketing:flash.bannerCreated'));
    res.redirect('/marketing/banners');
  } catch (err) {
    next(err);
  }
};

exports.updateBanner = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, subtitle, banner_image, link_url, sort_order, start_date, end_date, status } = req.body;
    const newStatus = status === 'inactive' ? 'inactive' : 'active';
    if (!title) {
      req.flash('error', req.t('marketing:flash.bannerRequiredFields'));
      return res.redirect('/marketing/banners/' + id + '/edit');
    }
    const [result] = await pool.execute(
      'UPDATE promotions SET title = ?, subtitle = ?, banner_image = ?, link_url = ?, sort_order = ?, start_date = ?, end_date = ?, status = ? WHERE id = ? AND type = ?',
      [title, subtitle || null, banner_image || null, link_url || null, parseInt(sort_order) || 0, start_date || null, end_date || null, newStatus, id, 'banner']
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.bannerNotFound'));
      return res.redirect('/marketing/banners');
    }
    await logActivity(req, 'update', 'banner', id);
    req.flash('success', req.t('marketing:flash.bannerUpdated'));
    res.redirect('/marketing/banners');
  } catch (err) {
    next(err);
  }
};

exports.updateBannerStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM promotions WHERE id = ?', [id]);
    const banner = rows[0];
    if (!banner || banner.type !== 'banner') {
      req.flash('error', req.t('marketing:flash.bannerNotFound'));
      return res.redirect('/marketing/banners');
    }
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE promotions SET status = ? WHERE id = ?', [newStatus, id]);
    await logActivity(req, newStatus === 'active' ? 'activate' : 'deactivate', 'banner', id);
    req.flash('success', req.t('marketing:flash.bannerStatusUpdated'));
    res.redirect('/marketing/banners');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

exports.getCoupons = async (req, res, next) => {
  try {
    const [coupons] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
    res.render('marketing/coupons', {
      title: req.t('marketing:title.coupons'),
      coupons,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getCouponForm = async (req, res, next) => {
  try {
    let coupon = null;
    let editing = false;
    if (req.params.id) {
      const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [parseInt(req.params.id)]);
      coupon = rows[0] || null;
      if (!coupon) {
        req.flash('error', req.t('marketing:flash.couponNotFound'));
        return res.redirect('/marketing/coupons');
      }
      editing = true;
    }
    res.render('marketing/coupon-form', {
      title: editing ? req.t('marketing:title.editCoupon') : req.t('marketing:title.newCoupon'),
      coupon,
      editing,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    const { code, name, type, value, min_order, max_uses, starts_at, expires_at } = req.body;
    if (!code || !value) {
      req.flash('error', req.t('marketing:flash.couponRequiredFields'));
      return res.redirect('/marketing/coupons/new');
    }
    const cleanCode = String(code).trim().toUpperCase();
    const [existing] = await pool.execute('SELECT id FROM coupons WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      req.flash('error', req.t('marketing:flash.couponCodeExists'));
      return res.redirect('/marketing/coupons/new');
    }
    const couponType = type === 'fixed' ? 'fixed' : 'percentage';
    const [result] = await pool.execute(
      'INSERT INTO coupons (code, name, type, value, min_order, max_uses, starts_at, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [cleanCode, name || null, couponType, value, min_order || null, max_uses || null, starts_at || null, expires_at || null, req.session.userId]
    );
    await logActivity(req, 'create', 'coupon', result.insertId);
    req.flash('success', req.t('marketing:flash.couponCreated'));
    res.redirect('/marketing/coupons');
  } catch (err) {
    next(err);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { code, name, type, value, min_order, max_uses, starts_at, expires_at, status } = req.body;
    if (!code || !value) {
      req.flash('error', req.t('marketing:flash.couponRequiredFields'));
      return res.redirect('/marketing/coupons/' + id + '/edit');
    }
    const cleanCode = String(code).trim().toUpperCase();
    const [existing] = await pool.execute('SELECT id FROM coupons WHERE code = ? AND id != ?', [cleanCode, id]);
    if (existing.length > 0) {
      req.flash('error', req.t('marketing:flash.couponCodeExists'));
      return res.redirect('/marketing/coupons/' + id + '/edit');
    }
    const couponType = type === 'fixed' ? 'fixed' : 'percentage';
    const newStatus = status === 'inactive' ? 'inactive' : 'active';
    const [result] = await pool.execute(
      'UPDATE coupons SET code = ?, name = ?, type = ?, value = ?, min_order = ?, max_uses = ?, starts_at = ?, expires_at = ?, status = ? WHERE id = ?',
      [cleanCode, name || null, couponType, value, min_order || null, max_uses || null, starts_at || null, expires_at || null, newStatus, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.couponNotFound'));
      return res.redirect('/marketing/coupons');
    }
    await logActivity(req, 'update', 'coupon', id);
    req.flash('success', req.t('marketing:flash.couponUpdated'));
    res.redirect('/marketing/coupons');
  } catch (err) {
    next(err);
  }
};

exports.updateCouponStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
    const coupon = rows[0];
    if (!coupon) {
      req.flash('error', req.t('marketing:flash.couponNotFound'));
      return res.redirect('/marketing/coupons');
    }
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE coupons SET status = ? WHERE id = ?', [newStatus, id]);
    await logActivity(req, newStatus === 'active' ? 'activate' : 'deactivate', 'coupon', id);
    req.flash('success', req.t('marketing:flash.couponStatusUpdated'));
    res.redirect('/marketing/coupons');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Featured / promoted products
// ---------------------------------------------------------------------------

exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.*, u.first_name, u.last_name, c.name AS category_name
       FROM products p
       LEFT JOIN users u ON p.technician_id = u.id
       LEFT JOIN product_categories c ON p.category_id = c.id
       ORDER BY p.featured DESC, p.is_promoted DESC, p.created_at DESC
       LIMIT 100`
    );
    res.render('marketing/featured-products', {
      title: req.t('marketing:title.featuredProducts'),
      products,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleProductFeatured = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    const product = rows[0];
    if (!product) {
      req.flash('error', req.t('marketing:flash.productNotFound'));
      return res.redirect('/marketing/featured-products');
    }
    const newVal = product.featured ? 0 : 1;
    await pool.execute('UPDATE products SET featured = ? WHERE id = ?', [newVal, id]);
    await logActivity(req, newVal ? 'feature' : 'unfeature', 'product', id);
    req.flash('success', req.t(newVal ? 'marketing:flash.productFeatured' : 'marketing:flash.productUnfeatured'));
    res.redirect('/marketing/featured-products');
  } catch (err) {
    next(err);
  }
};

exports.toggleProductPromoted = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    const product = rows[0];
    if (!product) {
      req.flash('error', req.t('marketing:flash.productNotFound'));
      return res.redirect('/marketing/featured-products');
    }
    const newVal = product.is_promoted ? 0 : 1;
    await pool.execute('UPDATE products SET is_promoted = ? WHERE id = ?', [newVal, id]);
    await logActivity(req, newVal ? 'promote' : 'unpromote', 'product', id);
    req.flash('success', req.t(newVal ? 'marketing:flash.productPromoted' : 'marketing:flash.productUnpromoted'));
    res.redirect('/marketing/featured-products');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

exports.getBlog = async (req, res, next) => {
  try {
    const [posts] = await pool.execute('SELECT * FROM blog_posts ORDER BY created_at DESC');
    res.render('marketing/blog', {
      title: req.t('marketing:title.blog'),
      posts,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getBlogForm = async (req, res, next) => {
  try {
    let post = null;
    let editing = false;
    if (req.params.id) {
      const [rows] = await pool.execute('SELECT * FROM blog_posts WHERE id = ?', [parseInt(req.params.id)]);
      post = rows[0] || null;
      if (!post) {
        req.flash('error', req.t('marketing:flash.blogNotFound'));
        return res.redirect('/marketing/blog');
      }
      editing = true;
    }
    res.render('marketing/blog-form', {
      title: editing ? req.t('marketing:title.editBlogPost') : req.t('marketing:title.newBlogPost'),
      post,
      editing,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createBlogPost = async (req, res, next) => {
  try {
    const { title, excerpt, content, cover_image, status } = req.body;
    if (!title) {
      req.flash('error', req.t('marketing:flash.blogRequiredFields'));
      return res.redirect('/marketing/blog/new');
    }
    let slug = generateSlug(title);
    const [existing] = await pool.execute('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      slug = slug + '-' + Date.now().toString(36);
    }
    const postStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';
    const [result] = await pool.execute(
      'INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, status, published_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, excerpt || null, content || null, cover_image || null, postStatus, postStatus === 'published' ? new Date() : null, req.session.userId]
    );
    await logActivity(req, 'create', 'blog_post', result.insertId);
    req.flash('success', req.t('marketing:flash.blogCreated'));
    res.redirect('/marketing/blog');
  } catch (err) {
    next(err);
  }
};

exports.updateBlogPost = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { title, excerpt, content, cover_image, status } = req.body;
    if (!title) {
      req.flash('error', req.t('marketing:flash.blogRequiredFields'));
      return res.redirect('/marketing/blog/' + id + '/edit');
    }
    const postStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';
    const [result] = await pool.execute(
      'UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, published_at = CASE WHEN ? = "published" AND published_at IS NULL THEN NOW() ELSE published_at END WHERE id = ?',
      [title, excerpt || null, content || null, cover_image || null, postStatus, postStatus, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.blogNotFound'));
      return res.redirect('/marketing/blog');
    }
    await logActivity(req, 'update', 'blog_post', id);
    req.flash('success', req.t('marketing:flash.blogUpdated'));
    res.redirect('/marketing/blog');
  } catch (err) {
    next(err);
  }
};

exports.updateBlogPostStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['draft', 'published', 'archived'];
    if (!valid.includes(status)) {
      req.flash('error', req.t('marketing:flash.invalidStatus'));
      return res.redirect('/marketing/blog');
    }
    const [result] = await pool.execute(
      'UPDATE blog_posts SET status = ?, published_at = CASE WHEN ? = "published" AND published_at IS NULL THEN NOW() ELSE published_at END WHERE id = ?',
      [status, status, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.blogNotFound'));
      return res.redirect('/marketing/blog');
    }
    await logActivity(req, status, 'blog_post', id);
    req.flash('success', req.t('marketing:flash.blogStatusUpdated'));
    res.redirect('/marketing/blog');
  } catch (err) {
    next(err);
  }
};

exports.deleteBlogPost = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await pool.execute('DELETE FROM blog_posts WHERE id = ?', [id]);
    await logActivity(req, 'delete', 'blog_post', id);
    req.flash('success', req.t('marketing:flash.blogDeleted'));
    res.redirect('/marketing/blog');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

exports.getTestimonials = async (req, res, next) => {
  try {
    const [testimonials] = await pool.execute('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.render('marketing/testimonials', {
      title: req.t('marketing:title.testimonials'),
      testimonials,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createTestimonial = async (req, res, next) => {
  try {
    const { author_name, author_role, content, rating, status } = req.body;
    if (!author_name || !content) {
      req.flash('error', req.t('marketing:flash.testimonialRequiredFields'));
      return res.redirect('/marketing/testimonials');
    }
    const testiStatus = ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending';
    const [result] = await pool.execute(
      'INSERT INTO testimonials (author_name, author_role, content, rating, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [author_name, author_role || null, content, parseInt(rating) || 5, testiStatus, req.session.userId]
    );
    await logActivity(req, 'create', 'testimonial', result.insertId);
    req.flash('success', req.t('marketing:flash.testimonialCreated'));
    res.redirect('/marketing/testimonials');
  } catch (err) {
    next(err);
  }
};

exports.updateTestimonialStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['pending', 'approved', 'rejected'];
    if (!valid.includes(status)) {
      req.flash('error', req.t('marketing:flash.invalidStatus'));
      return res.redirect('/marketing/testimonials');
    }
    await pool.execute('UPDATE testimonials SET status = ? WHERE id = ?', [status, id]);
    await logActivity(req, status === 'approved' ? 'approve' : status, 'testimonial', id);
    req.flash('success', req.t('marketing:flash.testimonialStatusUpdated'));
    res.redirect('/marketing/testimonials');
  } catch (err) {
    next(err);
  }
};

exports.deleteTestimonial = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await pool.execute('DELETE FROM testimonials WHERE id = ?', [id]);
    await logActivity(req, 'delete', 'testimonial', id);
    req.flash('success', req.t('marketing:flash.testimonialDeleted'));
    res.redirect('/marketing/testimonials');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

exports.getAnnouncements = async (req, res, next) => {
  try {
    const [announcements] = await pool.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    res.render('marketing/announcements', {
      title: req.t('marketing:title.announcements'),
      announcements,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, status } = req.body;
    if (!title || !message) {
      req.flash('error', req.t('marketing:flash.announcementRequiredFields'));
      return res.redirect('/marketing/announcements');
    }
    const newStatus = status === 'inactive' ? 'inactive' : 'active';
    const [result] = await pool.execute(
      'INSERT INTO announcements (title, message, status, created_by) VALUES (?, ?, ?, ?)',
      [title, message, newStatus, req.session.userId]
    );
    await logActivity(req, 'create', 'announcement', result.insertId);
    req.flash('success', req.t('marketing:flash.announcementCreated'));
    res.redirect('/marketing/announcements');
  } catch (err) {
    next(err);
  }
};

exports.updateAnnouncementStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    const announcement = rows[0];
    if (!announcement) {
      req.flash('error', req.t('marketing:flash.announcementNotFound'));
      return res.redirect('/marketing/announcements');
    }
    const newStatus = announcement.status === 'active' ? 'inactive' : 'active';
    await pool.execute('UPDATE announcements SET status = ? WHERE id = ?', [newStatus, id]);
    await logActivity(req, newStatus === 'active' ? 'activate' : 'deactivate', 'announcement', id);
    req.flash('success', req.t('marketing:flash.announcementStatusUpdated'));
    res.redirect('/marketing/announcements');
  } catch (err) {
    next(err);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await pool.execute('DELETE FROM announcements WHERE id = ?', [id]);
    await logActivity(req, 'delete', 'announcement', id);
    req.flash('success', req.t('marketing:flash.announcementDeleted'));
    res.redirect('/marketing/announcements');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Reviews + feedback
// ---------------------------------------------------------------------------

exports.getReviews = async (req, res, next) => {
  try {
    const [reviews] = await pool.execute(
      `SELECT r.*, u.first_name, u.last_name, p.name AS product_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN products p ON r.product_id = p.id
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.render('marketing/reviews', {
      title: req.t('marketing:title.reviews'),
      reviews,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.replyToReview = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      req.flash('error', req.t('marketing:flash.replyRequired'));
      return res.redirect('/marketing/reviews');
    }
    const [result] = await pool.execute(
      'UPDATE reviews SET seller_reply = ?, seller_replied_at = NOW(), seller_replied_by = ? WHERE id = ?',
      [reply.trim(), req.session.userId, id]
    );
    if (result.affectedRows === 0) {
      req.flash('error', req.t('marketing:flash.reviewNotFound'));
      return res.redirect('/marketing/reviews');
    }
    await logActivity(req, 'reply', 'review', id);
    req.flash('success', req.t('marketing:flash.reviewReplied'));
    res.redirect('/marketing/reviews');
  } catch (err) {
    next(err);
  }
};

exports.toggleReviewHidden = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
    const review = rows[0];
    if (!review) {
      req.flash('error', req.t('marketing:flash.reviewNotFound'));
      return res.redirect('/marketing/reviews');
    }
    const newVal = review.is_hidden ? 0 : 1;
    await pool.execute('UPDATE reviews SET is_hidden = ? WHERE id = ?', [newVal, id]);
    await logActivity(req, newVal ? 'hide' : 'unhide', 'review', id);
    req.flash('success', req.t(newVal ? 'marketing:flash.reviewHidden' : 'marketing:flash.reviewUnhidden'));
    res.redirect('/marketing/reviews');
  } catch (err) {
    next(err);
  }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const [messages] = await pool.execute(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100'
    );
    res.render('marketing/feedback', {
      title: req.t('marketing:title.feedback'),
      messages,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Newsletters
// ---------------------------------------------------------------------------

exports.getNewsletters = async (req, res, next) => {
  try {
    const [subscribers] = await pool.execute(
      'SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 200'
    );
    const [sends] = await pool.execute(
      'SELECT * FROM newsletter_sends ORDER BY created_at DESC LIMIT 50'
    );
    res.render('marketing/newsletters', {
      title: req.t('marketing:title.newsletters'),
      subscribers,
      sends,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.createSubscriber = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      req.flash('error', req.t('marketing:flash.invalidEmail'));
      return res.redirect('/marketing/newsletters');
    }
    await pool.execute(
      'INSERT INTO newsletter_subscribers (email) VALUES (?) ON DUPLICATE KEY UPDATE status = "subscribed"',
      [String(email).trim().toLowerCase()]
    );
    await logActivity(req, 'add', 'subscriber');
    req.flash('success', req.t('marketing:flash.subscriberAdded'));
    res.redirect('/marketing/newsletters');
  } catch (err) {
    next(err);
  }
};

exports.updateSubscriberStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.execute('SELECT * FROM newsletter_subscribers WHERE id = ?', [id]);
    const subscriber = rows[0];
    if (!subscriber) {
      req.flash('error', req.t('marketing:flash.subscriberNotFound'));
      return res.redirect('/marketing/newsletters');
    }
    const newStatus = subscriber.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    await pool.execute('UPDATE newsletter_subscribers SET status = ? WHERE id = ?', [newStatus, id]);
    await logActivity(req, newStatus === 'subscribed' ? 'subscribe' : 'unsubscribe', 'subscriber', id);
    req.flash('success', req.t('marketing:flash.subscriberStatusUpdated'));
    res.redirect('/marketing/newsletters');
  } catch (err) {
    next(err);
  }
};

exports.deleteSubscriber = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    await pool.execute('DELETE FROM newsletter_subscribers WHERE id = ?', [id]);
    await logActivity(req, 'delete', 'subscriber', id);
    req.flash('success', req.t('marketing:flash.subscriberDeleted'));
    res.redirect('/marketing/newsletters');
  } catch (err) {
    next(err);
  }
};

exports.sendNewsletter = async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    if (!subject) {
      req.flash('error', req.t('marketing:flash.newsletterRequiredFields'));
      return res.redirect('/marketing/newsletters');
    }
    const [countRow] = await pool.execute(
      "SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE status = 'subscribed'"
    );
    const [result] = await pool.execute(
      'INSERT INTO newsletter_sends (subject, body, recipient_count, sent_by) VALUES (?, ?, ?, ?)',
      [subject, body || null, countRow[0].count, req.session.userId]
    );
    await logActivity(req, 'send', 'newsletter', result.insertId);
    req.flash('success', req.t('marketing:flash.newsletterSent'));
    res.redirect('/marketing/newsletters');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Analytics + reports
// ---------------------------------------------------------------------------

exports.getAnalytics = async (req, res, next) => {
  try {
    const range = req.query.range || '30days';
    let days = 30;
    if (range === '7days') days = 7;
    if (range === '90days') days = 90;
    if (range === 'year') days = 365;

    const [visits] = await pool.execute(
      `SELECT visit_date, COUNT(DISTINCT visitor_key) AS visitors
       FROM website_visits WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY visit_date ORDER BY visit_date ASC`,
      [days]
    );
    const [orders] = await pool.execute(
      `SELECT DATE(created_at) AS d, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND order_status != 'cancelled'
       GROUP BY DATE(created_at) ORDER BY d ASC`,
      [days]
    );
    const [couponUses] = await pool.execute('SELECT COALESCE(SUM(used_count), 0) AS uses FROM coupons');
    const [visitors30] = await pool.execute(
      'SELECT COUNT(DISTINCT visitor_key) AS count FROM website_visits WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    );
    const [orders30] = await pool.execute(
      "SELECT COUNT(*) AS count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    const [revenue30] = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );

    const visitors = visitors30[0].count;
    const conversionRate = visitors > 0 ? ((orders30[0].count / visitors) * 100).toFixed(1) : '0.0';

    const chartLabels = [];
    const chartVisitors = [];
    const chartOrders = [];
    const chartRevenue = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chartLabels.push(key);
      const v = visits.find((r) => new Date(r.visit_date).toISOString().slice(0, 10) === key);
      chartVisitors.push(v ? v.visitors : 0);
      const o = orders.find((r) => new Date(r.d).toISOString().slice(0, 10) === key);
      chartOrders.push(o ? o.orders : 0);
      chartRevenue.push(o ? Number(o.revenue) : 0);
    }

    const metrics = {
      visitors,
      orders: orders30[0].count,
      revenue: revenue30[0].total,
      conversion_rate: conversionRate,
      coupon_uses: couponUses[0].uses
    };

    res.render('marketing/analytics', {
      title: req.t('marketing:title.analytics'),
      metrics,
      range,
      chartLabels: JSON.stringify(chartLabels),
      chartVisitors: JSON.stringify(chartVisitors),
      chartOrders: JSON.stringify(chartOrders),
      chartRevenue: JSON.stringify(chartRevenue),
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getProductPerformance = async (req, res, next) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.id, p.name, p.slug, p.price, p.main_image, p.featured, p.is_promoted, p.total_sales,
              COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
              COALESCE(SUM(oi.total_price), 0) AS sold_revenue
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY p.id, p.name, p.slug, p.price, p.main_image, p.featured, p.is_promoted, p.total_sales
       ORDER BY sold_revenue DESC, sold_quantity DESC
       LIMIT 100`
    );
    res.render('marketing/product-performance', {
      title: req.t('marketing:title.productPerformance'),
      products,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getCampaignAnalytics = async (req, res, next) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT 100'
    );
    const [salesTotal] = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status != 'cancelled'"
    );
    res.render('marketing/campaign-analytics', {
      title: req.t('marketing:title.campaignAnalytics'),
      campaigns,
      totalSales: salesTotal[0].total,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const [campaigns] = await pool.execute('SELECT COUNT(*) AS count FROM marketing_campaigns');
    const [promotions] = await pool.execute("SELECT COUNT(*) AS count FROM promotions WHERE status = 'active'");
    const [coupons] = await pool.execute('SELECT COUNT(*) AS count FROM coupons');
    const [blog] = await pool.execute('SELECT COUNT(*) AS count FROM blog_posts');
    const [subscribers] = await pool.execute("SELECT COUNT(*) AS count FROM newsletter_subscribers WHERE status = 'subscribed'");
    const [reviews] = await pool.execute('SELECT COUNT(*) AS count FROM reviews');
    const [featured] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE featured = 1');
    const [promoted] = await pool.execute('SELECT COUNT(*) AS count FROM products WHERE is_promoted = 1');
    const [sales] = await pool.execute(
      "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE order_status != 'cancelled'"
    );
    const [visitors] = await pool.execute('SELECT COUNT(DISTINCT visitor_key) AS count FROM website_visits');
    const [recentOrders] = await pool.execute(
      `SELECT o.order_reference, o.total_amount, o.created_at, o.order_status, u.first_name, u.last_name
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 20`
    );

    const report = {
      campaigns: campaigns[0].count,
      active_promotions: promotions[0].count,
      coupons: coupons[0].count,
      blog_posts: blog[0].count,
      subscribers: subscribers[0].count,
      reviews: reviews[0].count,
      featured_products: featured[0].count,
      promoted_products: promoted[0].count,
      total_sales: sales[0].total,
      total_visitors: visitors[0].count,
      generated_at: new Date()
    };

    res.render('marketing/reports', {
      title: req.t('marketing:title.reports'),
      report,
      recentOrders,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Profile + settings
// ---------------------------------------------------------------------------

exports.getProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.session.userId);
    res.render('marketing/profile', {
      title: req.t('marketing:title.profile'),
      user,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, bio, current_password, new_password } = req.body;
    const user = await UserModel.findById(req.session.userId);

    if (!first_name || !last_name) {
      req.flash('error', req.t('marketing:flash.profileRequiredFields'));
      return res.redirect('/marketing/profile');
    }

    if (new_password) {
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(current_password || '', user.password);
      if (!valid) {
        req.flash('error', req.t('marketing:flash.currentPasswordWrong'));
        return res.redirect('/marketing/profile');
      }
      if (new_password.length < 8) {
        req.flash('error', req.t('marketing:flash.passwordTooShort'));
        return res.redirect('/marketing/profile');
      }
      const hashed = await bcrypt.hash(new_password, 10);
      await UserModel.updatePassword(user.id, hashed);
    }

    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ?, bio = ? WHERE id = ?',
      [first_name, last_name, phone || null, bio || null, user.id]
    );

    await logActivity(req, 'update', 'profile', user.id);
    req.flash('success', req.t('marketing:flash.profileUpdated'));
    res.redirect('/marketing/profile');
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SettingModel.getGroup('marketing');
    res.render('marketing/settings', {
      title: req.t('marketing:title.settings'),
      settings,
      page: pageInfo(req),
      can: PERMISSIONS
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { company_name, default_from_email, newsletter_footer, social_facebook, social_twitter, social_instagram } = req.body;
    await SettingModel.setGroup({
      marketing_company_name: company_name || '',
      marketing_default_from_email: default_from_email || '',
      marketing_newsletter_footer: newsletter_footer || '',
      marketing_social_facebook: social_facebook || '',
      marketing_social_twitter: social_twitter || '',
      marketing_social_instagram: social_instagram || ''
    }, 'marketing');
    await logActivity(req, 'update', 'settings', null);
    req.flash('success', req.t('marketing:flash.settingsUpdated'));
    res.redirect('/marketing/settings');
  } catch (err) {
    next(err);
  }
};
