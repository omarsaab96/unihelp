const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    helpOffer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HelpOffer",
      default: null,
    },
    bid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1, helpOffer: 1, bid: 1 });

module.exports = mongoose.model("Chat", chatSchema);
