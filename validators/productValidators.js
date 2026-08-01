const { body, param } = require('express-validator');

const createProductValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('admin:validation.productNameRequired'))
    .isLength({ min: 3, max: 200 }).withMessage((value, { req }) => req.t('admin:validation.productNameLength')),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage((value, { req }) => req.t('admin:validation.descriptionMax')),

  body('price')
    .notEmpty().withMessage((value, { req }) => req.t('admin:validation.priceRequired'))
    .isFloat({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.pricePositive')),

  body('discount_price')
    .optional({ values: 'falsy' })
    .trim()
    .isFloat({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.discountPositive'))
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error(req.t('admin:validation.discountLessThanPrice'));
      }
      return true;
    }),

  body('category_id')
    .notEmpty().withMessage((value, { req }) => req.t('admin:validation.categoryRequired'))
    .isInt({ min: 1 }).withMessage((value, { req }) => req.t('admin:validation.categoryValid')),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.stockNonNegative')),

  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage((value, { req }) => req.t('admin:validation.skuMax')),

  body('is_active')
    .optional()
    .isIn(['0', '1', 'true', 'false']).withMessage((value, { req }) => req.t('admin:validation.invalidActiveStatus'))
];

const updateProductValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage((value, { req }) => req.t('admin:validation.invalidProductId')),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage((value, { req }) => req.t('admin:validation.productNameLength')),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage((value, { req }) => req.t('admin:validation.descriptionMax')),

  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.pricePositive')),

  body('discount_price')
    .optional({ values: 'falsy' })
    .trim()
    .isFloat({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.discountPositive'))
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) >= parseFloat(req.body.price)) {
        throw new Error(req.t('admin:validation.discountLessThanPrice'));
      }
      return true;
    }),

  body('category_id')
    .optional()
    .isInt({ min: 1 }).withMessage((value, { req }) => req.t('admin:validation.categoryValid')),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage((value, { req }) => req.t('admin:validation.stockNonNegative')),

  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage((value, { req }) => req.t('admin:validation.skuMax')),

  body('is_active')
    .optional()
    .isIn(['0', '1', 'true', 'false']).withMessage((value, { req }) => req.t('admin:validation.invalidActiveStatus'))
];

module.exports = { createProductValidator, updateProductValidator };
