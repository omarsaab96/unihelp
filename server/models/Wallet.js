const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }],
    balance: { type: Number, required: true, default: 0 },
    availableBalance: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'EGP' }
}, { timestamps: true });


module.exports = mongoose.model('Wallet', walletSchema);
