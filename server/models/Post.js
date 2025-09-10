// models/Post.js
const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    type: { type: String, enum: ['text', 'image', 'video', 'multipleMedia'], required: true },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true },
        date: { type: Date, default: Date.now }
    }],
    shares: { type: Number, default: 0 },
    content: String,
    media: {
        images: [{ type: String }],
        videos: [{ type: String }],
    },
    date: { type: Date, default: Date.now },
    linked: {
        type: Boolean,
        default: true,
    },
    lastLinked: {
        type: Date,
        default: null,
    },
});

module.exports = mongoose.model('Post', PostSchema);
