const mongoose = require("mongoose");

const JobReportSchema = new mongoose.Schema(
  {
    offer: { type: mongoose.Schema.Types.ObjectId, ref: "HelpOffer", required: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reports: [
      {
        reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolutionNote: { type: String, default: "" },
    settlement: {
      mode: { type: String, enum: ["normal", "split", "noPayment"], default: null },
      totalAmount: { type: Number, default: 0 },
      payerAmount: { type: Number, default: 0 },
      beneficiaryAmount: { type: Number, default: 0 },
      payer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobReport", JobReportSchema);
