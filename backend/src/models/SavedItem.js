const mongoose = require('mongoose');

// Looks and favorites have the same small set of fields, in separate collections.
const savedItemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, minlength: 2, maxlength: 100 },
  notes: { type: String, default: '', maxlength: 1000 },
  imageUrl: { type: String, default: '', maxlength: 2000 },
  productUrl: { type: String, default: '', maxlength: 2000 }
}, { timestamps: true });
savedItemSchema.index({ owner: 1, createdAt: -1, _id: -1 });

module.exports = {
  Look: mongoose.model('Look', savedItemSchema),
  Favorite: mongoose.model('Favorite', savedItemSchema)
};
