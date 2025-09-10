const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
  name: String,
  sport: String,
  ageGroup: String,
  gender: String,
  image: String,
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  coaches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }],
  linked: {
    type: Boolean,
    default: true,
  },
  lastLinked: {
    type: Date,
    default: null,
  },
  createdAt: Date,
});

// Index for better query performance
TeamSchema.index({ club: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', TeamSchema);