const { param, query } = require('express-validator');
const mongoose = require('mongoose');

const objectIdParam = (name = 'id') => [
  param(name).custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage(`Invalid ${name}`),
];

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
  query('sort').optional().trim(),
];

module.exports = { objectIdParam, paginationQuery };
