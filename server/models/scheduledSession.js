const mongoose = require("mongoose");

const scheduledSessionSchema = new mongoose.Schema({
    tutorID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dateAndTime: { type: Date, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    paid: { type: Boolean, default: false },
    linked: { type: Boolean, default: true }, 
}, { timestamps: true });

module.exports = mongoose.model("ScheduledSession", scheduledSessionSchema);

