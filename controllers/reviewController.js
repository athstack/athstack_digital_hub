const ReviewModel = require('../models/ReviewModel');
const ProductModel = require('../models/ProductModel');

exports.submitProductReview = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const userId = req.session.userId;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please select a rating between 1 and 5.');
      return res.redirect('back');
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/shop');
    }

    await ReviewModel.create({
      user_id: userId,
      product_id: productId,
      rating: parseInt(rating),
      comment: comment || null,
      type: 'product',
      status: 'pending'
    });

    req.flash('success', 'Thank you! Your review has been submitted and is pending approval.');
    res.redirect(`/shop/${product.slug}`);
  } catch (err) {
    next(err);
  }
};

exports.submitTechReview = async (req, res, next) => {
  try {
    const techId = parseInt(req.params.techId);
    const userId = req.session.userId;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please select a rating between 1 and 5.');
      return res.redirect('back');
    }

    await ReviewModel.create({
      user_id: userId,
      technician_id: techId,
      rating: parseInt(rating),
      comment: comment || null,
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

    if (!rating || rating < 1 || rating > 5) {
      req.flash('error', 'Please select a rating between 1 and 5.');
      return res.redirect('back');
    }

    await ReviewModel.create({
      user_id: userId,
      repair_id: repairId,
      rating: parseInt(rating),
      comment: comment || null,
      type: 'service',
      status: 'pending'
    });

    req.flash('success', 'Thank you! Your review has been submitted and is pending approval.');
    res.redirect('/dashboard/repairs');
  } catch (err) {
    next(err);
  }
};
