// models/offer.js
const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: null
  },
  photo: {
    type: String,
    default: "https://equalengineers.com/wp-content/uploads/2024/04/dummy-logo-5b.png",
  },
  linked: {
    type: Boolean,
    default: true
  },
  deadline: {
    type: Date,
    default: null
  },
  universities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "University"
  }],
}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);
