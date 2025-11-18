// routes/users.js
const express = require("express");
const router = express.Router();
const University = require("../models/University");
const authMiddleware = require("../utils/middleware/auth");

// Get all universitites
router.get("/", async (req, res) => {
  try {
    const universitites = await User.find();
    res.json(universitites);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch universitites" });
  }
});

// Get single university
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const university = await User.findById(req.params.id);

    if (!university) return res.status(404).json({ error: "university not found" });

    res.json(university);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch university" });
  }
});




module.exports = router;
