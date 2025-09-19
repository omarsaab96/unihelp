const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");


// ✅ Create a tutor
router.post("/", async (req, res) => {
  try {
    const tutor = new Tutor(req.body);
    await tutor.save();
    res.status(201).json(tutor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Get tutors
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const q = req.query.q ? String(req.query.q).trim() : null;
    const subject = req.query.subject ? String(req.query.subject).trim() : null;
    const minRate = req.query.minRate ? Number(req.query.minRate) : null;
    const maxRate = req.query.maxRate ? Number(req.query.maxRate) : null;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
      ];
    }

    if (subject) {
      filter.subjects = subject;
    }

    if (minRate !== null || maxRate !== null) {
      filter.hourlyRate = {};
      if (minRate !== null) filter.hourlyRate.$gte = minRate;
      if (maxRate !== null) filter.hourlyRate.$lte = maxRate;
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder;

    const tutors = await Tutor.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Tutor.countDocuments(filter);

    const hasMore = page * limit < total;

    res.json({
      data: tutors,
      page,
      limit,
      total,   // 🔥 now matches same logic as university events
      hasMore,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ✅ Get tutor by ID
router.get("/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "Tutor not found" });
    res.json(tutor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Update tutor
router.put("/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tutor) return res.status(404).json({ error: "Tutor not found" });
    res.json(tutor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Delete tutor
router.delete("/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndDelete(req.params.id);
    if (!tutor) return res.status(404).json({ error: "Tutor not found" });
    res.json({ message: "Tutor deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
