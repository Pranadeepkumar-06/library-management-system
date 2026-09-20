const { body } = require('express-validator');

const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number');

const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  body('username').trim().notEmpty().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_.]+$/i).withMessage('Invalid username'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  passwordRule,
  body('phone').optional().trim().matches(/^[+\d][\d\s-]{6,19}$/).withMessage('Invalid phone'),
];

const loginValidator = [
  body('identifier').trim().notEmpty().withMessage('Email or username required'),
  body('password').notEmpty().withMessage('Password required'),
];

const forgotValidator = [body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail()];
const resetValidator = [
  body('token').notEmpty().withMessage('Token required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];
const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase')
    .matches(/[a-z]/).withMessage('Must contain lowercase')
    .matches(/[0-9]/).withMessage('Must contain number'),
];

module.exports = { registerValidator, loginValidator, forgotValidator, resetValidator, changePasswordValidator };
