// models/Bid.js
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  offer: { type: mongoose.Schema.Types.ObjectId, ref: "HelpOffer", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  duration: { type: Number, required: true },
  amount: { type: Number, required: true },
  acceptedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Bid", bidSchema);
