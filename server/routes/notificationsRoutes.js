const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require("../utils/middleware/auth");

// GET all notifications for current user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id }).sort({ dateTime: -1 });
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST create new notification
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, content, dateTime } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }

        const newNotification = new Notification({
            title,
            content,
            dateTime: dateTime || Date.now(),
            userId: req.user.id
        });

        await newNotification.save();
        res.status(201).json(newNotification);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { read: true },
            { new: true }
        );

        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        res.json(notification);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PATCH mark all notifications as read for current user
router.patch('/markAllRead', authMiddleware, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json({
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
