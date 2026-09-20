const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const signAccessToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const opts = cookieOptions();
  // 15 min access, 7 day refresh (parse approx)
  res.cookie('accessToken', accessToken, { ...opts, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res) => {
  const opts = cookieOptions();
  res.clearCookie('accessToken', { ...opts });
  res.clearCookie('refreshToken', { ...opts });
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  cookieOptions,
};
