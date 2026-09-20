const { body } = require('express-validator');
const mongoose = require('mongoose');

const oid = (v) => {
  if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid ObjectId');
  return true;
};

const issueValidator = [
  body('memberId').notEmpty().withMessage('memberId required').custom(oid),
  body('bookId').notEmpty().withMessage('bookId required').custom(oid),
  body('bookCopyId').optional().custom((v) => { if (v && !mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid bookCopyId'); return true; }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const returnValidator = [
  body('condition').optional().isIn(['GOOD', 'DAMAGED', 'LOST']).withMessage('Invalid condition'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const markLostValidator = [
  body('notes').optional().trim().isLength({ max: 1000 }),
];

module.exports = { issueValidator, returnValidator, markLostValidator };
