const { body } = require('express-validator');
const mongoose = require('mongoose');

const fineValidator = [
  body('memberId').notEmpty().withMessage('memberId required').custom((v) => {
    if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid memberId');
    return true;
  }),
  body('loanId').optional().custom((v) => {
    if (v && !mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid loanId');
    return true;
  }),
  body('amount').notEmpty().isFloat({ min: 0.01 }).withMessage('amount must be > 0').toFloat(),
  body('reason').optional().isIn(['LATE_RETURN', 'LOST_BOOK', 'DAMAGED_BOOK', 'OTHER']),
  body('dueDate').optional().isISO8601().toDate(),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const payValidator = [
  body('paymentMethod').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

module.exports = { fineValidator, payValidator };
