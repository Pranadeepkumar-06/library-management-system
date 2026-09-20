const { body } = require('express-validator');

const publisherValidator = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 120 }),
  body('description').optional().isLength({ max: 2000 }),
  body('website').optional().trim().isLength({ max: 200 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('address').optional().trim().isLength({ max: 200 }),
  body('country').optional().trim().isLength({ max: 80 }),
];

module.exports = { publisherValidator };
