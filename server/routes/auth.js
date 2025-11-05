// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refreshsupersecret";

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { firstname,lastname, email, password } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    if(email.split('@')[1] == "bilgiedu.net"){
      unveristy = 'Istanbul Bilgi University'
    }

    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      unveristy: unveristy||null
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

    // Create tokens
    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/refresh-token", async (req, res) => {
  const { token } = req.body; // destructure token from body
  if (!token) return res.status(401).json({ error: "Refresh token required." });

  try {
    // Check if the token exists in user's refreshTokens array
    const user = await User.findOne({ refreshTokens: token });
    if (!user) return res.status(403).json({ error: "Invalid refresh token." });

    // Verify refresh token
    jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ error: "Invalid refresh token." });

      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: decoded.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken: newAccessToken });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /logout
router.post("/logout", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required." });

  try {
    const user = await User.findOne({ refreshTokens: token });
    if (!user) return res.status(400).json({ error: "Invalid token." });

    // Remove the token from DB
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    await user.save();

    res.json({ message: "Logged out successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
