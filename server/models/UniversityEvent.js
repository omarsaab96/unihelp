const mongoose = require('mongoose');

const UniversityEventSchema = new mongoose.Schema({
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University'
  },
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  category: { type: String },
  location: { type: String },
  totalNeeded: { type: Number, default: 0 },
  enrolled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  enrollementDeadline: { type: Date },
  requirements: { type: String },
  reward: {
    points: { type: Number, default: 0 },
    money: { type: Number, default: 0 },
    currency: { type: String, default: '$' }
  }
}, { timestamps: true });

module.exports = mongoose.model('UniversityEvent', UniversityEventSchema);