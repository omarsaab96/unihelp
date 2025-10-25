
const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const User = require('../models/User');
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

//get user's wallet
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user.userId;
        const wallet = await Wallet.findOne({ user }).populate('user', '_id name email image');
        if (!wallet) {
            const wallet = await Wallet.create({
                user, balance: 0, availableBalance: 0, currency: 'EGP'
            });
            res.status(200).json({ success: true, data: wallet });
            return;
        }
        res.status(200).json({ success: true, data: wallet });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

//create a new wallet
router.post('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user.userId;
        const { balance, availableBalance, currency } = req.body;

        const wallet = await Wallet.create({
            user, balance, availableBalance, currency
        });

        res.status(201).json({ success: true, data: wallet });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

//topup a wallet
router.put('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { amount = 0 } = req.body;

        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            wallet = await Wallet.create({
                user: userId,
                balance: amount,
                availableBalance: amount,
                currency: 'EGP'
            });
            return res.status(201).json({ success: true, data: wallet });
        }

        // ✅ Update existing wallet
        wallet.balance += amount;
        wallet.availableBalance += amount;
        await wallet.save();

        return res.status(200).json({ success: true, data: wallet });
    } catch (err) {
        console.error('Error updating wallet:', err);
        return res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
