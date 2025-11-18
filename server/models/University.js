// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UniversitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png",
  },
  rating: {
    type: Number,
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },
  linked: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

module.exports = mongoose.model("Universities", UniversitySchema);
