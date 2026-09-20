const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    fullName: { type: String, trim: true, index: true },
    biography: { type: String, maxlength: 5000 },
    dateOfBirth: { type: Date },
    dateOfDeath: { type: Date },
    nationality: { type: String, trim: true, maxlength: 80 },
    photo: { type: String, default: '' },
    website: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

authorSchema.pre('save', function (next) {
  if (!this.fullName || this.isModified('firstName') || this.isModified('lastName')) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }
  next();
});

authorSchema.index({ fullName: 'text', biography: 'text' });

module.exports = mongoose.model('Author', authorSchema);
