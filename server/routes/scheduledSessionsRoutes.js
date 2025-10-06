const express = require("express");
const ScheduledSession = require("../models/ScheduledSession");
const authMiddleware = require("../utils/middleware/auth");

const router = express.Router();

// GET all sessions for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userID = req.user.id;

        const sessions = await ScheduledSession.find({
            linked: true,
            tutorID: userID
        }).sort({ dateAndTime: 1 });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET sessions by date for the logged-in user
router.get('/byDate', authMiddleware, async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const userID = req.user.id;

        const sessions = await ScheduledSession.find({
            linked: true,
            $or: [{ tutorID: userID }, { studentID: userID }],
            dateAndTime: { $gte: start, $lt: end }
        }).sort({ dateAndTime: 1 });


        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create a new session
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { tutorID, studentID, dateAndTime,category, title, status, paid } = req.body;

        const session = new ScheduledSession({
            tutorID,
            studentID,
            dateAndTime,
            title,
            status,
            category,
            paid
        });

        await session.save();
        res.status(201).json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH update a session
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const updatedSession = await ScheduledSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedSession);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a session
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const session = await ScheduledSession.findByIdAndUpdate(
            req.params.id,
            { linked: false },
            { new: true }
        );
        if (!session) return res.status(404).json({ message: "Session not found" });
        res.json({ message: "Session unlinked", session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;