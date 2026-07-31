const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const WishlistModel = require('../models/WishlistModel');
const ReviewModel = require('../models/ReviewModel');
const ProductImageModel = require('../models/ProductImageModel');
const { paginate, formatCurrency, calculateDiscount } = require('../utils/helpers');

exports.getShop = async (req, res, next) => {
  try {
    const category = req.query.category || null;
    const search = req.query.search || null;
    const minPrice = parseFloat(req.query.min_price) || 0;
    const maxPrice = parseFloat(req.query.max_price) || 999999;
    const page = parseInt(req.query.page) || 1;

    const result = await ProductModel.getFiltered({
      category,
      search,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice !== 999999 ? maxPrice : undefined,
      page,
      limit: 12
    });

    const categories = await CategoryModel.getAll();
    const totalPages = Math.ceil(result.total / result.limit);

    res.render('shop/index', {
      title: 'Shop Premium Accessories - TechBridge Digital Hub',
      products: result.products,
      categories,
      activeCategory: category,
      searchQuery: search,
      pagination: { page: result.page, totalPages, total: result.total, hasNext: result.page < totalPages, hasPrev: result.page > 1 },
      minPrice: req.query.min_price || '',
      maxPrice: req.query.max_price || '',
      formatCurrency
    });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await ProductModel.findBySlug(req.params.slug);
    if (!product) {
      req.flash('error', 'Product not found.');
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
      title: `${product.name} - TechBridge Digital Hub`,
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
      formatCurrency,
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
