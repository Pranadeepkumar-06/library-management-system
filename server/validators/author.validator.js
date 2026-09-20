const { body } = require('express-validator');

const authorValidator = [
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 60 }),
  body('lastName').trim().notEmpty().withMessage('Last name required').isLength({ max: 60 }),
  body('biography').optional().isLength({ max: 5000 }),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid dateOfBirth').toDate(),
  body('dateOfDeath').optional().isISO8601().withMessage('Invalid dateOfDeath').toDate(),
  body('nationality').optional().trim().isLength({ max: 80 }),
  body('website').optional().trim().isLength({ max: 200 }),
];

const authorUpdateValidator = [
  body('firstName').optional().trim().notEmpty().isLength({ max: 60 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 60 }),
  body('biography').optional().isLength({ max: 5000 }),
  body('dateOfBirth').optional().isISO8601().toDate(),
  body('dateOfDeath').optional().isISO8601().toDate(),
  body('nationality').optional().trim().isLength({ max: 80 }),
  body('website').optional().trim().isLength({ max: 200 }),
];

module.exports = { authorValidator, authorUpdateValidator };
