const { body } = require('express-validator');

const createUserValidator = [
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 50 }),
  body('username').trim().notEmpty().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_.]+$/i).withMessage('Invalid username'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars')
    .matches(/[A-Z]/).withMessage('Need uppercase').matches(/[a-z]/).withMessage('Need lowercase').matches(/[0-9]/).withMessage('Need number'),
  body('role').optional().isIn(['ADMIN', 'LIBRARIAN', 'MEMBER']).withMessage('Invalid role'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('Invalid status'),
  body('phone').optional().trim().matches(/^[+\d][\d\s-]{6,19}$/).withMessage('Invalid phone'),
];

const updateUserValidator = [
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('email').optional().trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9_.]+$/i),
  body('password').optional().isLength({ min: 8 }).matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/),
  body('role').optional().isIn(['ADMIN', 'LIBRARIAN', 'MEMBER']),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  body('phone').optional().trim().matches(/^[+\d][\d\s-]{6,19}$/).withMessage('Invalid phone'),
  body('address').optional().trim().isLength({ max: 200 }),
  body('city').optional().trim().isLength({ max: 80 }),
  body('state').optional().trim().isLength({ max: 80 }),
  body('country').optional().trim().isLength({ max: 80 }),
];

const statusValidator = [
  body('status').isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('Invalid status'),
];

module.exports = { createUserValidator, updateUserValidator, statusValidator };
