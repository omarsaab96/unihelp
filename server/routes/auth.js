// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const University = require("../models/University");
const authMiddleware = require("../utils/middleware/auth");
const { sendEmail } = require("../utils/emailService");


const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refreshsupersecret";
const JWT_INVITE_SECRET = process.env.JWT_INVITE_SECRET || "invite-supersecret";
const INVITE_DEEPLINK_BASE = process.env.APP_INVITE_DEEPLINK_BASE || "unihelp://setPassword";

const buildInviteLink = (token) => {
  const separator = INVITE_DEEPLINK_BASE.includes("?") ? "&" : "?";
  return `${INVITE_DEEPLINK_BASE}${separator}token=${encodeURIComponent(token)}`;
};

// POST /register
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    if (!firstname || !lastname || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const universityDomain = email.split("@")[1];

    const university = await University.findOne({ domain: universityDomain });

    if ((role == 'student' || role == 'staff') && !university) {
      return res.status(400).json({ error: "Invalid university email." });
    }

    const newUser = new User({
      firstname,
      lastname,
      email,
      role,
      password: hashedPassword,
      university: university ? university._id : null
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/invite", authMiddleware, async (req, res) => {
  try {
    const { firstname, lastname, email, role, photo, bio } = req.body;

    if (!firstname || !lastname || !email || !role) {
      return res.status(400).json({ error: "First name, last name, email, and role are required." });
    }

    const adminUser = await User.findById(req.user.id).select("role");
    if (!adminUser || (adminUser.role !== "sudo" && adminUser.role !== "admin")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const universityDomain = email.split("@")[1];
    const university = await University.findOne({ domain: universityDomain });

    if ((role === "student" || role === "staff") && !university) {
      return res.status(400).json({ error: "Invalid university email." });
    }

    const newUser = new User({
      firstname,
      lastname,
      email,
      role,
      photo: photo || undefined,
      bio: bio || undefined,
      password: null,
      mustResetPassword: true,
      invitationPending: true,
      invitedAt: new Date(),
      university: university ? university._id : null,
    });

    await newUser.save();

    const inviteToken = jwt.sign(
      { id: newUser._id, email: newUser.email, purpose: "set-password" },
      JWT_INVITE_SECRET,
      { expiresIn: "7d" }
    );

    const inviteLink = buildInviteLink(inviteToken);
    const emailSent = await sendEmail(
      newUser.email,
      "Set up your Unihelp account",
      `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2>Welcome to Unihelp</h2>
          <p>Hello ${firstname},</p>
          <p>Your account has been created. Tap the button below on your phone to set your password and finish setup.</p>
          <p>
            <a href="${inviteLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
              Set your password
            </a>
          </p>
          <p>If the button does not open the app, use this link directly on your mobile device:</p>
          <p>${inviteLink}</p>
          <p>This link expires in 7 days.</p>
        </div>
      `
    );

    if (!emailSent) {
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({ error: "Failed to send invite email." });
    }

    res.status(201).json({ message: "Invitation sent successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/set-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required." });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_INVITE_SECRET);
    } catch (err) {
      return res.status(400).json({ error: "Invite link is invalid or expired." });
    }

    const user = await User.findById(payload.id);
    if (!user || user.email !== payload.email) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.invitationPending && !user.mustResetPassword) {
      return res.status(400).json({ error: "Invite link has already been used." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.mustResetPassword = false;
    user.invitationPending = false;
    user.inviteAcceptedAt = new Date();
    if (!user.verified) {
      user.verified = {};
    }
    user.verified.email = user.verified?.email || new Date();

    await user.save();

    res.json({ message: "Password set successfully.", email: user.email });
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
    if (!user.password) {
      return res.status(400).json({ error: "Use your invitation link to set your password first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

    // Create tokens
    const accessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({ accessToken, refreshToken, mustResetPassword: !!user.mustResetPassword });
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
    if (!user) return res.status(404).json({ error: "User not found." });

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
