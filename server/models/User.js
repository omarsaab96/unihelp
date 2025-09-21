// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    default: null
  },
  university: {
    type: String,
    default: null
  },
  major: {
    type: String,
    default: null
  },
  minor: {
    type: String,
    default: null
  },
  gpa: {
    type: Number,
    default: null
  },
  bio: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "university", "admin"],
    default: "student",
  },
  notificationToken: {
    type: String,
    default: null
  },
  verified: {
    email: {
      type: Date,
      default: null
    },
    phone: {
      type: Date,
      default: null
    },
    university: {
      type: Date,
      default: null
    }
  },
  linked: {
    type: Boolean,
    default: true
  },
  refreshTokens: [String]
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
