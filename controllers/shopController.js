const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const WishlistModel = require('../models/WishlistModel');
const ReviewModel = require('../models/ReviewModel');
const ProductImageModel = require('../models/ProductImageModel');
const { calculateDiscount } = require('../utils/helpers');
const { convertToBase } = require('../utils/currency');

exports.getShop = async (req, res, next) => {
  try {
    const category = req.query.category || null;
    const search = req.query.search || null;
    let minPrice = parseFloat(req.query.min_price) || 0;
    let maxPrice = parseFloat(req.query.max_price) || 999999;

    // The price filter form is entered in the user's display currency, but
    // products are stored in the base currency (USD). Convert before querying.
    if (req.currency && req.currency !== 'USD') {
      minPrice = convertToBase(minPrice, req.currency);
      maxPrice = convertToBase(maxPrice, req.currency);
    }
    const page = parseInt(req.query.page) || 1;
    const validSorts = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'rating', 'sales'];
    const sort = validSorts.includes(req.query.sort) ? req.query.sort : 'newest';
    const availability = req.query.availability || '';
    const in_stock = availability === 'in_stock';

    const result = await ProductModel.getFiltered({
      category,
      search,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice !== 999999 ? maxPrice : undefined,
      sort,
      page,
      limit: 12,
      in_stock
    });

    const categories = await CategoryModel.getAll();
    const totalPages = Math.ceil(result.total / result.limit);

    res.render('shop/index', {
      title: req.t('shop:index.title'),
      products: result.products,
      categories,
      activeCategory: category,
      activeSort: sort,
      activeAvailability: availability,
      searchQuery: search,
      pagination: { page: result.page, totalPages, total: result.total, hasNext: result.page < totalPages, hasPrev: result.page > 1 },
      minPrice: req.query.min_price || '',
      maxPrice: req.query.max_price || ''
    });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findBySlug(req.params.slug);
    if (!product) {
      req.flash('error', req.t('shop:flash.productNotFound'));
      return res.redirect('/shop');
    }

    const gallery = await ProductImageModel.getByProduct(product.id);
    let isWishlisted = false;
    if (req.session.userId) {
      isWishlisted = await WishlistModel.isWishlisted(req.session.userId, product.id);
    }

    const reviewStats = await ReviewModel.getProductStats(product.id);
    const reviewData = await ReviewModel.getByProduct(product.id, {
      page: 1,
      limit: 5,
      userId: req.session.userId
    });
    const reviewGallery = await ReviewModel.getPhotoGallery(product.id, 24);

    let reviewEligibility = null;
    if (req.session.userId) {
      reviewEligibility = await ReviewModel.getEligibilityForProduct(req.session.userId, product.id);
    }

    const relatedProducts = await ProductModel.getRelated(product.id, product.category_id, 8);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + (product.stock_quantity > 0 ? 3 : 7));

    res.render('shop/details', {
      title: req.t('shop:details.title', { name: product.name }),
      product,
      gallery,
      isWishlisted,
      reviews: reviewData.reviews,
      reviewCount: reviewStats.count,
      avgRating: reviewStats.average,
      reviewStats,
      reviewGallery,
      reviewEligibility,
      hasMoreReviews: reviewData.hasMore,
      relatedProducts,
      deliveryDate,
      calculateDiscount,
      formatDisplayName: res.locals.formatDisplayName,
      reviewThumbUrl: res.locals.reviewThumbUrl
    });
  } catch (err) {
    next(err);
  }
};

exports.searchSuggestions = async (req, res, next) => {
  try {
    const term = (req.query.term || '').trim();
    if (term.length < 2) {
      return res.json([]);
    }

    const results = await ProductModel.searchSuggestions(term);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.debugReviews = async (req, res, next) => {
  try {
    const productId = parseInt(req.query.product_id);
    if (!productId) {
      return res.status(400).json({ error: 'product_id required' });
    }

    const { query, queryOne } = require('../config/db');

    const stats = await queryOne(
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

    const reviews = await query(
      `SELECT id, product_id, technician_id, type, status, is_hidden, is_verified, rating, title, comment, images, created_at
       FROM reviews
       WHERE product_id = ?`,
      [productId]
    );

    res.json({
      productId,
      stats: stats || {},
      reviews: reviews || [],
      count: reviews?.length || 0
    });
  } catch (err) {
    next(err);
  }
};
