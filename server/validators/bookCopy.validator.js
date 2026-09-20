const { body } = require('express-validator');
const mongoose = require('mongoose');

const bookCopyValidator = [
  body('book').notEmpty().withMessage('book id required').custom((v) => {
    if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid book id');
    return true;
  }),
  body('accessionNumber').optional().trim().isLength({ max: 60 }),
  body('barcode').optional().trim().isLength({ max: 60 }),
  body('copyNumber').optional().isInt({ min: 1 }).toInt(),
  body('condition').optional().isIn(['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST']),
  body('status').optional().isIn(['AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE']),
  body('shelfLocation').optional().trim().isLength({ max: 50 }),
  body('purchaseDate').optional().isISO8601().toDate(),
  body('purchasePrice').optional().isFloat({ min: 0 }).toFloat(),
  body('supplier').optional().trim().isLength({ max: 120 }),
];

const bookCopyUpdateValidator = [
  body('condition').optional().isIn(['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'LOST']),
  body('status').optional().isIn(['AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE']),
  body('shelfLocation').optional().trim().isLength({ max: 50 }),
  body('purchaseDate').optional().isISO8601().toDate(),
  body('purchasePrice').optional().isFloat({ min: 0 }).toFloat(),
  body('supplier').optional().trim().isLength({ max: 120 }),
];

module.exports = { bookCopyValidator, bookCopyUpdateValidator };
