const mongoose = require('mongoose');

const UniversityEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
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
    money: { type: String, default: null },
  }
}, { timestamps: true });

module.exports = mongoose.model('UniversityEvent', UniversityEventSchema);