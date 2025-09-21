const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    subjects: [{ type: String }],
    hourlyRate: { type: Number, required: true },
    availability: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutor", tutorSchema);
