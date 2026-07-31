const ReviewModel = require('../models/ReviewModel');
const ProductModel = require('../models/ProductModel');
const NotificationModel = require('../models/NotificationModel');
const { processReviewImages } = require('../helpers/reviewImages');

const { MAX_REVIEW_IMAGES, COMMENT_MIN, COMMENT_MAX, TITLE_MAX } = ReviewModel;

function validateReviewFields({ rating, title, comment }) {
  const errors = [];
  if (rating !== undefined && rating !== null) {
    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) errors.push('Please select a rating between 1 and 5.');
  }
  const text = String(comment === undefined || comment === null ? '' : comment).trim();
  if (text.length < COMMENT_MIN) errors.push(`Your review must be at least ${COMMENT_MIN} characters.`);
  if (text.length > COMMENT_MAX) errors.push(`Your review must be under ${COMMENT_MAX} characters.`);
  if (title !== undefined && title !== null && String(title).trim().length > TITLE_MAX) {
    errors.push(`Review title must be under ${TITLE_MAX} characters.`);
  }
  return { rating: r, errors };
}

exports.submitProductReview = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.session.userId;
    const { rating, title, comment } = req.body;

    const { errors } = validateReviewFields({ rating, title, comment });
    if (errors.length) {
      req.flash('error', errors[0]);
      return res.redirect(req.get('Referrer') || `/shop/${req.query.slug || ''}`);
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/shop');
    }

    const eligibility = await ReviewModel.getEligibilityForProduct(userId, productId);
    if (!eligibility.hasPurchased) {
      req.flash('error', 'You can only review products you have purchased and received. Please shop with us first!');
      return res.redirect(`/shop/${product.slug}#reviews`);
    }
    if (eligibility.hasReviewed) {
      req.flash('info', 'You have already reviewed this product. You can edit your existing review.');
      return res.redirect(`/dashboard/reviews/${eligibility.review.id}/edit`);
    }

    const images = await processReviewImages(req.files || []);

    const review = await ReviewModel.create({
      user_id: userId,
      product_id: productId,
      order_id: eligibility.order ? eligibility.order.id : null,
      rating: parseInt(rating, 10),
      title: (title || '').trim() || null,
      comment: (comment || '').trim(),
      images,
      type: 'product',
      status: 'pending',
      is_verified: true
    });

    await NotificationModel.notifyAdmins({
      title: 'New Review Pending Approval',
      message: `${product.name} received a new review (${rating} stars).`,
      type: 'review',
      link: '/admin/reviews?status=pending'
    });

    req.flash('success', 'Thank you! Your review has been submitted and is pending approval.');
    res.redirect(`/shop/${product.slug}#reviews`);
  } catch (err) {
    next(err);
  }
};

exports.editProductReview = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.session.userId;
    const { rating, title, comment, remove_images } = req.body;

    const { rating: safeRating, errors } = validateReviewFields({ rating, title, comment });
    if (errors.length) {
      req.flash('error', errors[0]);
      return res.redirect(req.get('Referrer') || '/dashboard/reviews');
    }

    const review = await ReviewModel.getOwnedById(userId, parseInt(req.params.reviewId || 0));
    if (!review || review.product_id !== productId) {
      req.flash('error', 'Review not found.');
      return res.redirect('/dashboard/reviews');
    }

    let images = review.images || [];
    if (remove_images) {
      const removeSet = new Set(
        (Array.isArray(remove_images) ? remove_images : [remove_images]).map(String)
      );
      images = images.filter(url => !removeSet.has(String(url)));
    }
    const newImages = await processReviewImages(req.files || []);
    images = images.concat(newImages).slice(0, MAX_REVIEW_IMAGES);

    await ReviewModel.updateCustomer(userId, review.id, {
      rating: safeRating,
      title: (title || '').trim() || null,
      comment: (comment || '').trim(),
      images
    });

    const wasApproved = review.status === 'approved';
    if (wasApproved && review.product_id) {
      await ReviewModel.updateProductRating(review.product_id);
    }

    req.flash('success', 'Your review has been updated.');
    res.redirect('/dashboard/reviews');
  } catch (err) {
    next(err);
  }
};

exports.toggleHelpful = async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Please log in to mark reviews as helpful.' });

    const result = await ReviewModel.toggleHelpful(reviewId, userId);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

exports.reportReview = async (req, res, next) => {
  try {
    const reviewId = parseInt(req.params.id);
    const userId = req.session.userId || null;
    const reason = String(req.body.reason || '').trim().slice(0, 255) || 'Inappropriate content';

    if (!userId) return res.status(401).json({ error: 'Please log in to report a review.' });

    const review = await ReviewModel.getById(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    await ReviewModel.report(reviewId, userId, reason);

    await NotificationModel.notifyAdmins({
      title: 'Review Reported',
      message: `A review on "${review.product_name || 'a product'}" was reported.`,
      type: 'review',
      link: '/admin/reviews?reported=1'
    });

    res.json({ success: true, message: 'Thank you. This review has been flagged for review.' });
  } catch (err) {
    next(err);
  }
};

exports.getProductReviewsApi = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    const sort = req.query.sort || 'recent';
    const rating = parseInt(req.query.rating, 10) || null;
    const hasPhotos = req.query.hasPhotos === '1';
    const isVerified = req.query.verified === '1';
    const search = String(req.query.search || '').trim().slice(0, 100) || null;

    const result = await ReviewModel.getByProduct(productId, {
      page,
      limit,
      sort,
      rating,
      hasPhotos,
      isVerified,
      search,
      userId: req.session.userId
    });

    const renderOptions = {
      reviews: result.reviews,
      currentUserId: req.session.userId,
      csrfToken: res.locals.csrfToken || '',
      formatDisplayName: res.locals.formatDisplayName,
      reviewThumbUrl: res.locals.reviewThumbUrl,
      imageUrl: res.locals.imageUrl
    };

    res.render('partials/reviewCard', renderOptions, (err, html) => {
      if (err) return next(err);
      res.json({
        success: true,
        html,
        total: result.total,
        page: result.page,
        hasMore: result.hasMore
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.submitTechReview = async (req, res, next) => {
  try {
    const techId = parseInt(req.params.techId);
    const userId = req.session.userId;
    const { rating, comment } = req.body;

    const { errors } = validateReviewFields({ rating, title: null, comment });
    if (errors.length) {
      req.flash('error', errors[0]);
      return res.redirect('back');
    }

    await ReviewModel.create({
      user_id: userId,
      technician_id: techId,
      rating: parseInt(rating),
      comment: (comment || '').trim(),
      type: 'technician',
      status: 'pending'
    });

    req.flash('success', 'Thank you! Your review has been submitted and is pending approval.');
    res.redirect('back');
  } catch (err) {
    next(err);
  }
};

exports.submitServiceReview = async (req, res, next) => {
  try {
    const repairId = parseInt(req.params.repairId);
    const userId = req.session.userId;
    const { rating, comment } = req.body;

    const { errors } = validateReviewFields({ rating, title: null, comment });
    if (errors.length) {
      req.flash('error', errors[0]);
      return res.redirect('back');
    }

    await ReviewModel.create({
      user_id: userId,
      repair_id: repairId,
      rating: parseInt(rating),
      comment: (comment || '').trim(),
      type: 'service',
      status: 'pending'
    });

    req.flash('success', 'Thank you! Your review has been submitted and is pending approval.');
    res.redirect('/dashboard/repairs');
  } catch (err) {
    next(err);
  }
};
