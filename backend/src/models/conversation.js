const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
      default: 'New conversation',
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ owner: 1, updatedAt: -1, _id: -1 });

const Conversation =
  mongoose.models.Conversation ||
  mongoose.model('Conversation', conversationSchema);

module.exports = { Conversation };
