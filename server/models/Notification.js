const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    dateTime: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Notification', NotificationSchema);