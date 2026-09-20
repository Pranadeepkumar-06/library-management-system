const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors.array().map((e) => ({ field: e.path, message: e.msg, value: e.value }));
  return next(ApiError.unprocessable('Validation failed', 'VALIDATION_ERROR', details));
};

module.exports = validate;
