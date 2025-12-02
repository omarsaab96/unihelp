// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UniversitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  domain: {
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
    default: "https://static.vecteezy.com/system/resources/previews/053/788/394/non_2x/university-icon-a-clean-and-simple-illustration-perfect-for-educational-designs-vector.jpg",
  },
  cover: {
    type: String,
    default: "https://static.vecteezy.com/system/resources/thumbnails/002/175/386/small_2x/university-graduation-background-free-vector.jpg",
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
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, { timestamps: true });

module.exports = mongoose.model("University", UniversitySchema);
