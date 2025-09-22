const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subjects: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutor", tutorSchema);
