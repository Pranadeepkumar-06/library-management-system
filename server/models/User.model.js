const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name required'], trim: true, maxlength: 50 },
    lastName: { type: String, required: [true, 'Last name required'], trim: true, maxlength: 50 },
    username: {
      type: String, required: [true, 'Username required'], unique: true, trim: true, lowercase: true,
      minlength: 3, maxlength: 30, match: [/^[a-z0-9_.]+$/, 'Invalid username'],
    },
    email: {
      type: String, required: [true, 'Email required'], unique: true, trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: [true, 'Password required'], minlength: 8, select: false },
    phone: { type: String, trim: true, match: [/^[+\d][\d\s-]{6,19}$/, 'Invalid phone'] },
    profileImage: { type: String, default: '' },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 20 },

    role: { type: String, enum: ['ADMIN', 'LIBRARIAN', 'MEMBER'], default: 'MEMBER', index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    refreshTokenHash: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },

    membershipId: { type: String, unique: true, sparse: true, index: true },
    membershipStartDate: { type: Date },
    membershipExpiryDate: { type: Date },

    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.tokenVersion = (this.tokenVersion || 0) + 1;
  }
  if (!this.membershipId && this.role === 'MEMBER') {
    const year = new Date().getFullYear();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.membershipId = `LIB-${year}-${rand}`;
    if (!this.membershipStartDate) this.membershipStartDate = new Date();
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createEmailVerificationToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return raw;
};

userSchema.methods.createPasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(raw).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  return raw;
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.refreshTokenHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
