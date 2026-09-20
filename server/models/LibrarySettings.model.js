const mongoose = require('mongoose');

const librarySettingsSchema = new mongoose.Schema(
  {
    libraryName: { type: String, default: 'Central Library', maxlength: 120 },
    libraryCode: { type: String, default: 'CL-001', maxlength: 30 },
    address: { type: String, maxlength: 250 },
    phone: { type: String, maxlength: 30 },
    email: { type: String, maxlength: 120 },
    maxBooksPerMember: { type: Number, default: 5, min: 1, max: 50 },
    loanDurationDays: { type: Number, default: 14, min: 1, max: 120 },
    maximumRenewals: { type: Number, default: 2, min: 0, max: 10 },
    finePerDay: { type: Number, default: 1, min: 0 },
    maximumFine: { type: Number, default: 100, min: 0 },
    reservationDurationDays: { type: Number, default: 7, min: 1, max: 60 },
    membershipDurationDays: { type: Number, default: 365, min: 1 },
    allowReservations: { type: Boolean, default: true },
    allowRenewals: { type: Boolean, default: true },
  },
  { timestamps: true }
);

let cached = null;
librarySettingsSchema.statics.getSettings = async function () {
  if (cached) return cached;
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  cached = doc;
  return doc;
};

librarySettingsSchema.statics.invalidateCache = function () {
  cached = null;
};

module.exports = mongoose.model('LibrarySettings', librarySettingsSchema);
