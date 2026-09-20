const { body } = require('express-validator');
const mongoose = require('mongoose');

const objectIdOrEmpty = (v) => {
  if (!v) return true;
  if (!mongoose.Types.ObjectId.isValid(v)) throw new Error('Invalid ObjectId');
  return true;
};

const bookValidator = [
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 250 }),
  body('subtitle').optional().trim().isLength({ max: 250 }),
  body('isbn10').optional({ checkFalsy: true }).trim().matches(/^[\dX-]{9,13}$/).withMessage('Invalid ISBN-10'),
  body('isbn13').optional({ checkFalsy: true }).trim().matches(/^[\d-]{12,17}$/).withMessage('Invalid ISBN-13'),
  body('description').optional().isLength({ max: 10000 }),
  body('authors').isArray({ min: 1 }).withMessage('At least one author required'),
  body('authors.*').custom(objectIdOrEmpty).withMessage('Invalid author id'),
  body('publisher').optional({ checkFalsy: true }).custom(objectIdOrEmpty),
  body('categories').optional().isArray(),
  body('categories.*').custom(objectIdOrEmpty),
  body('language').optional().trim().isLength({ max: 60 }),
  body('publicationDate').optional().isISO8601().withMessage('Invalid publicationDate').toDate(),
  body('edition').optional().trim().isLength({ max: 50 }),
  body('pages').optional().isInt({ min: 1 }).toInt(),
  body('bookFormat').optional().isIn(['HARDCOVER', 'PAPERBACK', 'EBOOK', 'AUDIOBOOK']),
  body('shelfLocation').optional().trim().isLength({ max: 50 }),
  body('rackNumber').optional().trim().isLength({ max: 50 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['AVAILABLE', 'UNAVAILABLE', 'ARCHIVED']),
];

const bookUpdateValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 250 }),
  body('subtitle').optional().trim().isLength({ max: 250 }),
  body('isbn10').optional({ checkFalsy: true }).trim().matches(/^[\dX-]{9,13}$/),
  body('isbn13').optional({ checkFalsy: true }).trim().matches(/^[\d-]{12,17}$/),
  body('description').optional().isLength({ max: 10000 }),
  body('authors').optional().isArray({ min: 1 }),
  body('authors.*').optional().custom(objectIdOrEmpty),
  body('publisher').optional({ checkFalsy: true }).custom(objectIdOrEmpty),
  body('categories').optional().isArray(),
  body('categories.*').optional().custom(objectIdOrEmpty),
  body('language').optional().trim().isLength({ max: 60 }),
  body('publicationDate').optional().isISO8601().toDate(),
  body('edition').optional().trim().isLength({ max: 50 }),
  body('pages').optional().isInt({ min: 1 }).toInt(),
  body('bookFormat').optional().isIn(['HARDCOVER', 'PAPERBACK', 'EBOOK', 'AUDIOBOOK']),
  body('shelfLocation').optional().trim().isLength({ max: 50 }),
  body('rackNumber').optional().trim().isLength({ max: 50 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('tags').optional().isArray(),
  body('status').optional().isIn(['AVAILABLE', 'UNAVAILABLE', 'ARCHIVED']),
];

module.exports = { bookValidator, bookUpdateValidator };
