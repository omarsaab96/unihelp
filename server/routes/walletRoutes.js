
const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const authMiddleware = require("../utils/middleware/auth");


//get user's wallet
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = req.user.id;
        const wallet = await Wallet.findOne({ user }).populate('user', '_id name email image');
        if (!wallet) {
            const wallet = await Wallet.create({
                user, balance: 10000, availableBalance: 10000, currency: 'TRY'
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
router.post('/', authMiddleware, async (req, res) => {
    try {
        const user = req.user.id;
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
router.put('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount = 0 } = req.body;

        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            wallet = await Wallet.create({
                user: userId,
                balance: amount,
                availableBalance: amount,
                currency: 'TRY'
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
