// routes/users.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const authMiddleware = require("../utils/middleware/auth");
const bcrypt = require('bcrypt');

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("name photo email role");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post('/check', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ success: false, msg: 'Email or phone is required' });
  }

  try {
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(200).json({ success: false, msg: 'Email already exists' });
      }
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(200).json({ success: false, msg: 'Phone already exists' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Check failed:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

router.post('/checkpassword', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(req.body.password, user.password);


    if (!match) {
      return res.status(200).json({ success: false });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/updatePassword', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const password = req.body.password;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/resetPassword', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single user
router.get("/current", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -refreshTokens")
      .populate("university")
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
