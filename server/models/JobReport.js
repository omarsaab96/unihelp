const mongoose = require("mongoose");

const JobReportSchema = new mongoose.Schema(
  {
    offer: { type: mongoose.Schema.Types.ObjectId, ref: "HelpOffer", required: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobReport", JobReportSchema);
