const ApiError = require('../utils/ApiError');

// authorize('ADMIN'), authorize('ADMIN','LIBRARIAN')
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Not authenticated', 'NOT_AUTHENTICATED'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('Insufficient permissions', 'FORBIDDEN'));
  }
  next();
};

module.exports = authorize;
