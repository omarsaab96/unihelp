// routes/offer.js
const express = require("express");
const router = express.Router();
const Offer = require("../models/Offer");
const User = require("../models/User");
const authMiddleware = require("../utils/middleware/auth");

// Get all linked offers
router.get("/", async (req, res) => {
  try {
    const offers = await Offer.find({ linked: true })
      .populate("sponsor", "name logo")
      .sort({ createdAt: -1 });
    res.json({ data: offers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single offer by ID
router.get("/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate("sponsor", "name logo");
    if (!offer || !offer.linked) {
      return res.status(404).json({ error: "Offer not found" });
    }
    res.json(offer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create offer
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role != 'sudo') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const offer = new Offer(req.body);
    await offer.save();
    res.status(201).json(offer);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Update offer
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role != 'sudo') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    res.json(offer);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Soft delete (make linked = false)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role != 'sudo') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, { linked: false }, { new: true });
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    res.json({ message: "Offer soft deleted", offer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
