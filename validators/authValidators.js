const { body } = require('express-validator');

const registerValidator = [
  body('first_name')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.firstNameRequired'))
    .isLength({ min: 2, max: 50 }).withMessage((value, { req }) => req.t('auth:validators.firstNameLength'))
    .matches(/^[A-Za-z\s'-]+$/).withMessage((value, { req }) => req.t('auth:validators.firstNameChars')),

  body('last_name')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.lastNameRequired'))
    .isLength({ min: 2, max: 50 }).withMessage((value, { req }) => req.t('auth:validators.lastNameLength'))
    .matches(/^[A-Za-z\s'-]+$/).withMessage((value, { req }) => req.t('auth:validators.lastNameChars')),

  body('email')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.emailRequired'))
    .isEmail().withMessage((value, { req }) => req.t('auth:validators.emailInvalid'))
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[\d\s\-\(\)\+]{7,20}$/).withMessage((value, { req }) => req.t('auth:validators.phoneInvalid'))
    .custom((value, { req }) => {
      const digits = value.replace(/[\s\-\(\)\+]/g, '');
      if (digits.length < 7 || digits.length > 15) {
        throw new Error(req.t('auth:validators.phoneDigits'));
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.passwordRequired'))
    .isLength({ min: 8 }).withMessage((value, { req }) => req.t('auth:validators.passwordLength'))
    .matches(/[a-z]/).withMessage((value, { req }) => req.t('auth:validators.passwordLowercase'))
    .matches(/[A-Z]/).withMessage((value, { req }) => req.t('auth:validators.passwordUppercase'))
    .matches(/[0-9]/).withMessage((value, { req }) => req.t('auth:validators.passwordNumber')),

  body('confirm_password')
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.confirmPasswordRequired'))
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(req.t('auth:validators.passwordsDoNotMatch'));
      }
      return true;
    })
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.emailRequired'))
    .isEmail().withMessage((value, { req }) => req.t('auth:validators.emailInvalid'))
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage((value, { req }) => req.t('auth:validators.passwordRequired'))
];

module.exports = { registerValidator, loginValidator };
