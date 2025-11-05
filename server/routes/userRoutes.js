// routes/users.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Wallet = require("../models/Wallet");
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
    const user = await User.findById(req.user.id)
      .select("-password -refreshTokens")
      .slice('helpjobs', -5) 
      .populate({
        path: 'helpjobs.offer'
      });

    if (!user) return res.status(404).json({ error: "User not found" });

    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user.id,
        balance: 0,
        availableBalance: 0,
        currency: 'TRY',
      });
    }

    const userWithWallet = {
      ...user.toObject(),
      wallet: wallet.toObject(),
    };

    res.json(userWithWallet);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.put("/edit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;
