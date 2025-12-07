const mongoose = require("mongoose");

const redeemedCodeSchema = new mongoose.Schema({
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
        required: true
    },
    sponsorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sponsor",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    redeemedAt: {
        type: Date,
        default: Date.now
    },
    usedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    },
});

module.exports = mongoose.model("RedeemedCode", redeemedCodeSchema);