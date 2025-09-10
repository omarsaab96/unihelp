const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  activeParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: {
    text: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: Date,
  },
  lastOpened: {
    type: Map,
    of: Date
  },
  deleted: {
    type: Map,
    of: Date
  },
  visibleFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, {
  timestamps: true,
});

module.exports = mongoose.model("Chat", ChatSchema);
