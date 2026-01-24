const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: "" },
  type: { type: String, enum: ["text", "image", "audio", "file"], default: "text" },
  attachments: [
    {
      url: { type: String, required: true },
      mime: { type: String, required: true },
      name: { type: String },
      size: { type: Number },
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
