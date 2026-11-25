const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.set('toJSON', {
  transform(_document, record) {
    delete record.passwordHash;
    delete record.__v;
    return record;
  },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = { User };
