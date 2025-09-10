const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Inventory = require('../models/Inventory');

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

// Create inventory item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemName, category, quantity, unitPrice, description, image, club } = req.body;

    if (!club) {
      return res.status(400).json({ success: false, message: 'Club is required' });
    }

    if (!itemName) {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }

    const newItem = new Inventory({
      club,
      itemName,
      category,
      quantity,
      unitPrice,
      description,
      image
    });

    await newItem.save();

    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    console.error('Error creating inventory item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all inventory items by club (authenticated)
router.get('/byClub/:id', authenticateToken, async (req, res) => {
  try {
    const clubId = req.params.id;

    if (!clubId || clubId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid or missing club ID' });
    }

    const items = await Inventory.find({ club: clubId });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// get inventory item by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventory.find({ _id: id });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update inventory item by id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const club = req.user.id;

    const item = await Inventory.findOneAndUpdate({ _id: id, club }, updates, { new: true });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete inventory item by id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const club = req.user.id;

    const item = await Inventory.findOneAndDelete({ _id: id, club });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
