const express = require("express");
const router = express.Router();
const SupportMessage = require("../models/SupportMessage");
const authMiddleware = require("../utils/middleware/auth");

/**
 * POST /support/send
 * Create a support ticket
 */
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({
        message: "Message must be at least 5 characters long",
      });
    }

    const ticket = await SupportMessage.create({
      user: req.user.id,
      email: req.user.email,
      message,
    });

    return res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    console.error("Support send error:", err);
    res.status(500).json({
      message: "Failed to send support message",
    });
  }
});

/**
 * GET /support/my
 * Get all support messages for the logged-in user
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const messages = await SupportMessage.find({
      user: req.user.id,
    })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("Fetch user support messages error:", err);
    res.status(500).json({
      message: "Failed to fetch support messages",
    });
  }
});

module.exports = router;
