
const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const jwt = require("jsonwebtoken");


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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email image gender')  // Optional: Populate user info
      .populate('club', 'name email sport');       // Optional: Populate club info

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user, club, type, amount, dueDate, note } = req.body;

    const payment = await Payment.create({
      user,
      club,
      amount,
      dueDate,
      note,
      paid: false
    });

    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/club/:clubId', authenticateToken, async (req, res) => {
  try {
    const payments = await Payment.find({ club: req.params.clubId })
      .populate('user', 'name email image')

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { paid: true, paidDate: new Date() },
      { new: true }
    );

    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});


module.exports = router;
