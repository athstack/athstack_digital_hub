const express = require('express');
const router = express.Router();
const ProductModel = require('../models/ProductModel');
const { validateCsrf } = require('../middleware/csrf');

router.get('/', async (req, res) => {
  try {
    const category = req.query.category || null;
    const search = req.query.search || null;
    const minPrice = parseFloat(req.query.min_price) || 0;
    const maxPrice = parseFloat(req.query.max_price) || 99999;

    const products = await ProductModel.getFiltered(category, search, minPrice, maxPrice);
    const categories = await ProductModel.getCategories('product');

    res.render('shop/index', {
      title: 'Shop Premium Accessories',
      products,
      categories,
      activeCategory: category,
      searchQuery: search
    });
  } catch (err) {
    console.error(err);
    res.render('shop/index', {
      title: 'Shop Premium Accessories',
      products: [],
      categories: [],
      activeCategory: null,
      searchQuery: null
    });
  }
});

router.get('/details/:slug', async (req, res) => {
  try {
    const product = await ProductModel.getBySlug(req.params.slug);
    if (!product) return res.redirect('/shop');

    const gallery = await ProductModel.getGalleryImages(product.id);
    res.render('shop/details', { title: product.name, product, gallery });
  } catch (err) {
    console.error(err);
    res.redirect('/shop');
  }
});

router.get('/apiSearch', async (req, res) => {
  try {
    const term = (req.query.term || '').trim();
    if (term.length < 2) return res.json([]);

    const results = await ProductModel.getSearchSuggestions(term);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

module.exports = router;
