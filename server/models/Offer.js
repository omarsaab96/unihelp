// models/offer.js
const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sponsor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sponsor",
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
  deadline:{
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);
