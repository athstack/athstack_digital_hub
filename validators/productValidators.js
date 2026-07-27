const { body, param } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('discount_price')
    .optional({ values: 'falsy' })
    .trim()
    .isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error('Discount price must be less than the original price');
      }
      return true;
    }),

  body('category_id')
    .notEmpty().withMessage('Category is required')
    .isInt({ min: 1 }).withMessage('Please select a valid category'),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),

  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('SKU cannot exceed 50 characters'),

  body('is_active')
    .optional()
    .isIn(['0', '1', 'true', 'false']).withMessage('Invalid active status')
];

const updateProductValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid product ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),

  body('discount_price')
    .optional({ values: 'falsy' })
    .trim()
    .isFloat({ min: 0 }).withMessage('Discount price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error('Discount price must be less than the original price');
      }
      return true;
    }),

  body('category_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Please select a valid category'),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),

  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('SKU cannot exceed 50 characters'),

  body('is_active')
    .optional()
    .isIn(['0', '1', 'true', 'false']).withMessage('Invalid active status')
];

module.exports = { createProductValidator, updateProductValidator };
