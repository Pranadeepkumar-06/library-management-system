const { body } = require('express-validator');
const mongoose = require('mongoose');

const reservationValidator = [
  body('bookId').notEmpty().withMessage('bookId required').custom((v) => {
    if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid bookId');
    return true;
  }),
];

module.exports = { reservationValidator };
