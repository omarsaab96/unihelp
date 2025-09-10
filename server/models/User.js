const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  accountBadge: {
    type:Boolean,
    default:false
  },
  achievements: String,
  admin: {
    name: String,
    email: String,
    id: String
  },
  agreed: Boolean,
  bio: String,
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  clubs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  contactInfo: {
    phone: String,
    email: String,
    facebook: String,
    instagram: String,
    whatsapp: String,
    telegram: String,
    tiktok: String,
    snapchat: String,
    location: {
      latitude: String,
      longitude: String
    },
    description: String
  },
  country: String,
  dob: {
    day: String,
    month: String,
    year: String
  },
  email: String,
  events: String,
  gender: String,
  height: Number,
  highlights: String,
  image: String,
  isStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  memberOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: []
  }],
  name: String,
  organization: {
    name: String,
    role: String,
    location: String,
    since: String,
    independent: Boolean
  },
  parentEmail: String,
  password: String,
  personalAccount: {
    type: Boolean,
    default: true
  },
  phone: String,
  role: String,
  skills: {
    attack: Number,
    skill: Number,
    stamina: Number,
    speed: Number,
    defense: Number
  },
  skillsAreVerified: {
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    date: {
      type: Date,
      default: null
    }
  },
  sport: [String],
  stats: String,
  type: String,
  verified: {
    email: {
      type: Date,
      default: null
    },
    phone: {
      type: Date,
      default: null
    }
  },
  weight: Number,
  expoPushToken: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
