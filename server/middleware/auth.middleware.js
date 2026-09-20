const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
};

// Protect: requires valid access token, active user
const protect = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw ApiError.unauthorized('Not authenticated', 'NOT_AUTHENTICATED');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    throw ApiError.unauthorized('Invalid or expired token', 'INVALID_TOKEN');
  }

  if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
    throw ApiError.unauthorized('Invalid token subject', 'INVALID_TOKEN');
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw ApiError.unauthorized('User no longer exists', 'USER_NOT_FOUND');
  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`, 'ACCOUNT_INACTIVE');
  }

  req.user = user;
  next();
});

// Optional auth: attaches user if token present, never throws
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.status === 'ACTIVE') req.user = user;
  } catch (e) {
    // ignore
  }
  next();
});

module.exports = { protect, optionalAuth };
