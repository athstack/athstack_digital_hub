const { body } = require('express-validator');

const contactValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[\d\s\-\(\)\+]{7,20}$/).withMessage('Please provide a valid phone number')
    .custom((value) => {
      const digits = value.replace(/[\s\-\(\)\+]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        throw new Error('Phone number must be between 7 and 15 digits');
      }
      return true;
    }),

  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters')
];

module.exports = { contactValidator };
