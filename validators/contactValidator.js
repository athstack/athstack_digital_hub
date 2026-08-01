const { body } = require('express-validator');

const contactValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('contact:errors.nameRequired'))
    .isLength({ min: 2, max: 100 }).withMessage((value, { req }) => req.t('contact:errors.nameLength')),

  body('email')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('contact:errors.emailRequired'))
    .isEmail().withMessage((value, { req }) => req.t('contact:errors.emailInvalid'))
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[\d\s\-\(\)\+]{7,20}$/).withMessage((value, { req }) => req.t('contact:errors.phoneInvalid'))
    .custom((value, { req }) => {
      const digits = value.replace(/[\s\-\(\)\+]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        throw new Error(req.t('contact:errors.phoneDigits'));
      }
      return true;
    }),

  body('subject')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('contact:errors.subjectRequired'))
    .isLength({ min: 3, max: 200 }).withMessage((value, { req }) => req.t('contact:errors.subjectLength')),

  body('message')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('contact:errors.messageRequired'))
    .isLength({ min: 10, max: 5000 }).withMessage((value, { req }) => req.t('contact:errors.messageLength'))
];

module.exports = { contactValidator };
