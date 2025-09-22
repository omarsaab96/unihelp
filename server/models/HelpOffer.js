// models/HelpOffer.js
const mongoose = require("mongoose");

const HelpOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    helpType: {
      type: String,
      enum: ["tutoring", "project-help", "homework-help", "exam-prep"],
      required: true,
    },
    availability: {
      days: [String],
      startTime: String,
      endTime: String
    },
    price: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpOffer", HelpOfferSchema);
