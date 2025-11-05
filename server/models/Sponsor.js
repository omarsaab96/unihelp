// models/sponsor.js
const mongoose = require("mongoose");

const SponsorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  contactinfo: {
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    facebook: { type: String, default: null },
    instagram: { type: String, default: null },
  },
  description: {
    type: String,
    default: null
  },
  logo: {
    type: String,
    default: "https://equalengineers.com/wp-content/uploads/2024/04/dummy-logo-5b.png",
  },
  linked: {
    type: Boolean,
    default: true
  },
  featured:{
    type:Boolean,
    default:false
  }
}, { timestamps: true });

module.exports = mongoose.model("Sponsor", SponsorSchema);
