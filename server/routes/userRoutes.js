// routes/users.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../utils/middleware/auth");

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("name photo email role");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
router.get("/current", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshTokens");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});


module.exports = router;
