const { body } = require('express-validator');

const categoryValidator = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 80 }),
  body('description').optional().isLength({ max: 1000 }),
  body('parentCategory').optional({ nullable: true }).custom((v) => {
    if (v === null || v === '' || v === undefined) return true;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid parentCategory');
    return true;
  }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
];

module.exports = { categoryValidator };
