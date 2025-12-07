// routes/users.js
const express = require("express");
const router = express.Router();
const University = require("../models/University");
const User = require("../models/User");
const authMiddleware = require("../utils/middleware/auth");

// Get all universitites
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role != 'sudo') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const universitites = await University.find();
    res.json(universitites);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch universitites" });
  }
});

// Get single university
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const university = await University.findById(req.params.id);

    if (!university) return res.status(404).json({ error: "university not found" });

    res.json(university);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch university" });
  }
});

// Get students count in a university
router.get("/studentsCount/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const count = await User.countDocuments({
      university: id,
      role: "student"
    });

    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch students count" });
  }
});

// Create new university
router.post("/", async (req, res) => {
  try {
    const { name, domain, description, photo } = req.body;

    // Validate required fields
    if (!name || !domain) {
      return res.status(400).json({ error: "Name and domain are required." });
    }

    // Normalize domain
    const normalizedDomain = domain.trim().toLowerCase();

    // Check if domain already exists
    const existing = await University.findOne({ domain: normalizedDomain });
    if (existing) {
      return res.status(400).json({ error: "A university with this domain already exists." });
    }

    // Create new university
    const university = new University({
      name,
      domain: normalizedDomain,
      description: description || null,
      photo: photo || undefined, // keep default if not provided
    });

    await university.save();

    return res.status(201).json({
      message: "University created successfully.",
      university
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
