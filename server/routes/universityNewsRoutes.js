const express = require("express");
const jwt = require("jsonwebtoken");
const UniversityNews = require("../models/UniversityNews");
const router = express.Router();
const mongoose = require("mongoose");

// GET ALL /api/universityNews
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
    const sortBy = req.query.sortBy || 'date'; // default
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const filter = {};

    if (q) {
      // simple text search on title/description
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (startTime) filter.startTime = startTime;
    if (endTime) filter.endTime = endTime;
    if (category) filter.category = category;

    let universityNews;

    if (sortBy === 'enrolled') {
      // Special sorting by enrolled array length
      universityNews = await UniversityNews.aggregate([
        { $match: filter },
        { $addFields: { enrolledCount: { $size: { $ifNull: ["$enrolled", []] } } } },
        { $sort: { enrolledCount: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]);
    } else {
      // Normal sorting
      const sort = {};
      sort[sortBy] = sortOrder;
      universityNews = await UniversityNews.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    const total = await UniversityNews.countDocuments(filter);

    const hasMore = page * limit < universityNews.length;

    console.log(universityNews.length)

    res.json({
      data: universityNews,
      page,
      limit,
      total: universityNews.length,
      hasMore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/universityNews/universityId
// Supports pagination: ?page=1&limit=10
// Supports search: ?q=garden
router.get('/:universityId', async (req, res) => {
  try {
    const universityId = req.params.universityId;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const date = req.query.date ? new Date(req.query.date) : null;
    const startTime = req.query.startTime ? String(req.query.startTime) : null;
    const endTime = req.query.endTime ? String(req.query.endTime) : null;
    const category = req.query.category ? String(req.query.category) : null;
    const sortBy = req.query.sortBy || 'date'; // default
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const filter = {};
    filter.university = universityId;

    if (q) {
      // simple text search on title/description
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (startTime) filter.startTime = startTime;
    if (endTime) filter.endTime = endTime;
    if (category) filter.category = category;

    let universityNews;

    if (sortBy === 'enrolled') {
      // Special sorting by enrolled array length
      universityNews = await UniversityNews.aggregate([
        { $match: filter },
        { $addFields: { enrolledCount: { $size: { $ifNull: ["$enrolled", []] } } } },
        { $sort: { enrolledCount: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]);
    } else {
      // Normal sorting
      const sort = {};
      sort[sortBy] = sortOrder;
      universityNews = await UniversityNews.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    const total = await UniversityNews.countDocuments(filter);

    const hasMore = page * limit < universityNews.length;

    res.json({
      data: universityNews,
      page,
      limit,
      total: universityNews.length,
      hasMore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/universityNews/:id
// Get a specific university news
// router.get('/:id', async (req, res) => {
//   try {
//     const universityNews = await UniversityNews.find({ university: req.params.id });
//     if (!universityNews) return res.status(404).json({ error: 'University news not found' });
//     res.json(universityNews);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// POST /api/universityNews
// Create a new university news
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // basic validation
    if (!body.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const universityNews = new UniversityNews(body);
    await universityNews.save();
    res.status(201).json(universityNews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
