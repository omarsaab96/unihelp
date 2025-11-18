const mongoose = require('mongoose');

const UniversityNewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date },
  category: { type: String },
  location: { type: String },
  university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University'
    },
}, { timestamps: true });

module.exports = mongoose.model('UniversityNews', UniversityNewsSchema);