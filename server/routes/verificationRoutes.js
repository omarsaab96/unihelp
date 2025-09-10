const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const { generateOTP, generateVerificationToken, verifyOTP } = require('../utils/otpService.js');
const { sendEmail } = require('../utils/emailService.js');
const { sendWhatsapp } = require('../utils/whatsappService.js');


// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, '123456', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded; // decoded contains userId
    next();
  });
};

router.get("/test-smtp", async (req, res) => {
  try {
    // for demo, get email + otp from query
    const newEmail = req.query.email;
    const otp = Math.floor(100000 + Math.random() * 900000);

    if (!newEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // send test email
    await sendEmail(
      newEmail,
      "Verify your email",
      `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h3 style="color:#007bff;">${otp}</h3>
        <p>This code expires in <strong>10 minutes</strong>.</p>
      </div>
    `
    );

    res.json({ success: true, message: "Test email sent successfully!" });
  } catch (err) {
    console.error("SMTP error:", err);
    res.status(500).json({
      success: false,
      message: "SMTP test failed",
      error: err.message,
    });
  }
});

router.post("/email", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = generateOTP();
    const { token } = generateVerificationToken(otp);

    // send test email
    const emailSent = await sendEmail(
      user.email,
      "Verify your email",
      `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h3 style="color:#FF4000;">${otp}</h3>
        <p>This code expires in <strong>10 minutes</strong>.</p>
      </div>
      `
    );

    if (!emailSent) {
      return res.status(500).json({ success: false, message: "Failed to send email OTP" });
    }

    // send hashed token to frontend
    res.json({
      result: "success",
      verificationToken: token,
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error("Failed to send OTP to email:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP to email", error: err.message });
  }

});

router.post("/emailOtp", async (req, res) => {
  const { otp, verificationToken } = req.body;

  try {
    if (!verifyOTP(otp, verificationToken)) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    res.json({ result: "success", message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Failed to verify email", details: err.message });
  }

});

router.post("/:id/otp", async (req, res) => {
  const { otp, verificationToken, type } = req.body;

  try {
    if (!verifyOTP(otp, verificationToken)) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP valid → mark email as verified
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (type == "email") {
      // Ensure verified object exists
      if (!user.verified) user.verified = { email: null, phone: null };
      user.verified.email = Date.now();
    }
    if (type == "phone") {
      // Ensure verified object exists
      if (!user.verified) user.verified = { email: null, phone: null };
      user.verified.phone = Date.now();
    }

    await user.save();

    res.json({ result: "success", message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Failed to verify email", details: err.message });
  }
});

router.post("/:id", authenticateToken, async (req, res) => {
  const { type } = req.body;

  if (type == "email") {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const otp = generateOTP();
      const { token } = generateVerificationToken(otp);

      // send test email
      const emailSent = await sendEmail(
        user.email,
        "Verify your email",
        `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h3 style="color:#FF4000;">${otp}</h3>
        <p>This code expires in <strong>10 minutes</strong>.</p>
      </div>
      `
      );

      if (!emailSent) {
        return res.status(500).json({ success: false, message: "Failed to send email OTP" });
      }

      // send hashed token to frontend
      res.json({
        result: "success",
        verificationToken: token,
        message: "OTP sent to email",
      });
    } catch (err) {
      console.error("Failed to send OTP to email:", err);
      res.status(500).json({ success: false, message: "Failed to send OTP to email", error: err.message });
    }
  }

  if (type == "phone") {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const otp = generateOTP();
      const { token } = generateVerificationToken(otp);

      //send whatsapp OTP
      const whatsappSent = await sendWhatsapp(
        user.phone,
        otp
        // "Verify your phone number",
        // `Your OTP is:\n${otp}\nThis code expires in 10 minutes.`
      );
      if (!whatsappSent) {
        return res.status(500).json({ success: false, message: "Failed to send phone OTP" });
      }

      // send hashed token to frontend
      res.json({
        result: "success",
        verificationToken: token,
        message: "OTP sent to phone",
      });
    } catch (err) {
      console.error("Failed to send OTP to phone:", err);
      res.status(500).json({ success: false, message: "Failed to send OTP to phone", error: err.message });
    }
  }
});

module.exports = router;
