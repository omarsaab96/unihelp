const mongoose = require("mongoose");
const { Schema } = mongoose;

const SupportMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    email: {
      type: String,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "closed"],
      default: "open",
    },

    replied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportMessage", SupportMessageSchema);
