// models/HelpOffer.js
const mongoose = require("mongoose");

const HelpOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g. "Math Tutoring"
    description: { type: String, required: true },
    subject: { type: String, required: true }, // e.g. "Mathematics"
    helpType: {
      type: String,
      enum: ["tutoring", "project-help", "homework-help", "exam-prep"],
      required: true,
    },
    availability: { type: Date, required: false }, // optional date
    price: { type: Number, default: 0 }, // free if 0
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who created the offer
  },
  { timestamps: true }
);

module.exports = mongoose.model("HelpOffer", HelpOfferSchema);
