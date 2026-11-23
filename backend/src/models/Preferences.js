const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  style: { type: String, default: '', maxlength: 100 },
  stores: { type: [String], default: [], validate: value => value.length <= 10 }
}, { timestamps: true });

module.exports = mongoose.model('Preferences', preferencesSchema);
