const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const LibrarySettings = require('../models/LibrarySettings.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');
const logAudit = require('../middleware/audit');
const { signAccessToken, signRefreshToken, hashToken, setAuthCookies, clearAuthCookies } = require('../utils/tokens');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

// POST /api/auth/register — always creates MEMBER
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, phone } = req.body;

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
  if (existing) {
    if (existing.email === email.toLowerCase()) throw ApiError.conflict('Email already registered', 'EMAIL_EXISTS');
    throw ApiError.conflict('Username already taken', 'USERNAME_EXISTS');
  }

  const settings = await LibrarySettings.getSettings();
  const now = new Date();
  const expiry = new Date(now.getTime() + (settings.membershipDurationDays || 365) * 24 * 60 * 60 * 1000);

  const user = new User({
    firstName, lastName, username: username.toLowerCase(), email: email.toLowerCase(),
    password, phone, role: 'MEMBER', status: 'ACTIVE',
    membershipStartDate: now, membershipExpiryDate: expiry,
  });
  const rawVerify = user.createEmailVerificationToken();
  await user.save();

  const verifyUrl = `${CLIENT_URL}/verify-email?token=${rawVerify}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your library account',
    text: `Hi ${user.firstName}, verify your email: ${verifyUrl} (expires in 24h)`,
  });

  await logAudit({ req, user: user._id, action: 'USER_CREATED', entityType: 'User', entityId: user._id, description: `Member registered: ${user.email}` });

  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, { statusCode: 201, message: 'Registered successfully. Please verify your email.', data: { user: user.toSafeJSON() } });
});

// POST /api/auth/login { identifier, password }
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const key = String(identifier).toLowerCase().trim();
  const user = await User.findOne({ $or: [{ email: key }, { username: key }] }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`, 'ACCOUNT_INACTIVE');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await logAudit({ req, user: user._id, action: 'USER_LOGIN', entityType: 'User', entityId: user._id, description: `Login: ${user.email}` });
  return ApiResponse.success(res, { message: 'Logged in successfully', data: { user: user.toSafeJSON() } });
});

const logout = asyncHandler(async (req, res) => {
  const refresh = req.cookies && req.cookies.refreshToken;
  if (refresh) {
    try {
      const decoded = jwt.verify(refresh, process.env.REFRESH_TOKEN_SECRET);
      const u = await User.findById(decoded.id).select('+refreshTokenHash');
      if (u && u.refreshTokenHash === hashToken(refresh)) {
        u.refreshTokenHash = undefined;
        await u.save({ validateBeforeSave: false });
      }
    } catch (e) { /* ignore */ }
  }
  clearAuthCookies(res);
  return ApiResponse.success(res, { message: 'Logged out successfully', data: null });
});

// POST /api/auth/refresh — rotate using refresh cookie
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token', 'NOT_AUTHENTICATED');
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (e) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
  }
  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user) throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Account inactive', 'ACCOUNT_INACTIVE');
  if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) throw ApiError.unauthorized('Token revoked', 'TOKEN_REVOKED');
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
    throw ApiError.unauthorized('Refresh token reused or revoked', 'TOKEN_REVOKED');
  }
  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });
  return ApiResponse.success(res, { message: 'Token refreshed', data: { user: user.toSafeJSON() } });
});

const me = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { message: 'Profile fetched', data: { user: req.user.toSafeJSON() } });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() });
  // Always return success to prevent email enumeration
  if (!user) return ApiResponse.success(res, { message: 'If that email exists, a reset link was sent', data: null });
  const raw = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${CLIENT_URL}/reset-password?token=${raw}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({ to: user.email, subject: 'Reset your password', text: `Reset link (1h): ${resetUrl}` });
  return ApiResponse.success(res, { message: 'If that email exists, a reset link was sent', data: null });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpires: { $gt: new Date() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) throw ApiError.badRequest('Invalid or expired reset token', 'INVALID_TOKEN');
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHash = undefined; // revoke sessions
  await user.save();
  await logAudit({ req, user: user._id, action: 'PASSWORD_RESET', entityType: 'User', entityId: user._id, description: 'Password reset via token' });
  return ApiResponse.success(res, { message: 'Password reset successfully. Please log in.', data: null });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password +refreshTokenHash');
  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect', 'INVALID_PASSWORD');
  user.password = newPassword;
  user.refreshTokenHash = undefined;
  await user.save();
  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });
  await logAudit({ req, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user._id, description: 'Password changed' });
  return ApiResponse.success(res, { message: 'Password changed successfully', data: null });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token, email } = req.body;
  if (!token) throw ApiError.badRequest('Token required', 'TOKEN_REQUIRED');
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const query = { emailVerificationToken: hashed, emailVerificationExpires: { $gt: new Date() } };
  if (email) query.email = String(email).toLowerCase();
  const user = await User.findOne(query).select('+emailVerificationToken +emailVerificationExpires');
  if (!user) throw ApiError.badRequest('Invalid or expired verification token', 'INVALID_TOKEN');
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });
  return ApiResponse.success(res, { message: 'Email verified successfully', data: { user: user.toSafeJSON() } });
});

const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.isEmailVerified) return ApiResponse.success(res, { message: 'Email already verified', data: null });
  const raw = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${raw}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({ to: user.email, subject: 'Verify your library account', text: `Verify: ${verifyUrl}` });
  return ApiResponse.success(res, { message: 'Verification email sent', data: null });
});

module.exports = { register, login, logout, refresh, me, forgotPassword, resetPassword, changePassword, verifyEmail, resendVerification };
