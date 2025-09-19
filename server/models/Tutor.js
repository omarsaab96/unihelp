const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    subjects: [{ type: String }],
    hourlyRate: { type: Number, required: true },
    bio: { type: String },
    availability: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutor", tutorSchema);
