const express = require("express");
const jwt = require("jsonwebtoken");
const UniversityEvent = require("../models/UniversityEvent");
const router = express.Router();
const mongoose = require("mongoose");

// GET /api/universityEvents
// Supports pagination: ?page=1&limit=10
// Supports search: ?q=garden
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const date = req.query.date ? new Date(req.query.date) : null;
    const startTime = req.query.startTime ? String(req.query.startTime) : null;
    const endTime = req.query.endTime ? String(req.query.endTime) : null;
    const category = req.query.category ? String(req.query.category) : null;

    const filter = {};
    if (q) {
      // simple text search on title/description
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (date) filter.date = date;
    if (startTime) filter.startTime = startTime;
    if (endTime) filter.endTime = endTime;
    if (category) filter.category = category;

    const universityEvent = await UniversityEvent.find(filter)
      .sort({ date: 1 }) // upcoming first
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await UniversityEvent.countDocuments(filter);

    const hasMore = page * limit < total;

    res.json({
      data: universityEvent,
      page,
      limit,
      total,
      hasMore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/universityEvents/:id
// Get a specific university event
router.get('/:id', async (req, res) => {
  try {
    const universityEvent = await UniversityEvent.findById(req.params.id).lean();
    if (!universityEvent) return res.status(404).json({ error: 'University eEvent not found' });
    res.json(universityEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/universityEvents
// Create a new university event
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // basic validation
    if (!body.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const universityEvent = new UniversityEvent(body);
    await universityEvent.save();
    res.status(201).json(universityEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/universityEvents/:id/enroll
// body: { id: userId }
router.post('/:id/enroll', async (req, res) => {
  try {
    const { enrollingUserId } = req.body;
    if (!enrollingUserId) return res.status(400).json({ error: 'Enrolling user IS is missing' });

    const universityEvent = await UniversityEvent.findById(req.params.id);
    if (!universityEvent) return res.status(404).json({ error: 'University event not found' });

    // deadline check
    if (universityEvent.enrollementDeadline && new Date() > new Date(universityEvent.enrollementDeadline)) {
      return res.status(400).json({ error: 'Enrollment deadline has passed' });
    }

    // capacity check
    if (universityEvent.totalNeeded && universityEvent.enrolled.length >= universityEvent.totalNeeded) {
      return res.status(400).json({ error: 'University Event is full' });
    }

    // add enrollment
    universityEvent.enrolled.push({ enrollingUserId });
    await universityEvent.save();
    res.json({ success: true, universityEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
