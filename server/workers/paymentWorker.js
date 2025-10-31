// workers/paymentWorker.js
// This worker will process pending payments in the Payment collection
// and update user wallets accordingly.
// It runs every minute to ensure timely processing of payments.

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const HelpOffer = require('../models/HelpOffer');
const User = require('../models/User');
const Bid = require('../models/Bid');
const Wallet = require('../models/Wallet');
const { sendNotification } = require('../utils/notificationService');
dotenv.config({ path: __dirname + '/../.env' });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('[paymentAuditor] Connected to MongoDB'))
    .catch(err => console.error('[paymentAuditor] MongoDB connection error:', err));

let isProcessing = false;

const processPendingPayments = async () => {
    if (isProcessing) {
        console.log('[paymentAuditor] Skipping run — still processing previous batch');
        return;
    }

    isProcessing = true;

    try {
        const pendingPayments = await Payment.find({ status: 'pending' });
        if (pendingPayments.length === 0) {
            console.log('[paymentAuditor] No pending payments.');
            return;
        }

        for (const payment of pendingPayments) {
            console.log(`[paymentAuditor] Processing payment ${payment._id}...`);

            const payerWallet = await Wallet.findOne({ user: payment.payer });
            const beneficiaryWallet = await Wallet.findOne({ user: payment.beneficiary });

            if (!payerWallet || payerWallet.balance < payment.amount) {
                console.warn(`[paymentAuditor] No wallet or insufficient funds.`);
                payment.status = 'declined';
                await payment.save();
                continue;
            }

            // Deduct from payer
            payerWallet.balance -= payment.amount;
            await payerWallet.save();

            // Add to beneficiary
            beneficiaryWallet.balance += payment.amount;
            beneficiaryWallet.availableBalance += payment.amount;
            await beneficiaryWallet.save();

            // Mark payment completed
            payment.status = 'completed';
            payment.completedAt = new Date();
            await payment.save();

            //get offerId
            const offerId = payment.note.split(".")[0];
            const rawId = offerId.split(':')[1].trim();

            const helpOffer = await HelpOffer.findById(rawId)
                .populate({
                    path: "bids",
                    populate: { path: "user", select: "_id firstname lastname photo" },
                });

            if (!helpOffer) {
                console.log("Offer now found");
            }

            const acceptedBid = helpOffer.bids.find(b => b.acceptedAt != null);

            helpOffer.systemApproved = new Date();
            await helpOffer.save()

            const totalPoints = acceptedBid.duration * 7 * 8 * 60;

            const payerUser = await User.findById(payment.payer).select('firstname lastname seeked totalPoints');
            const beneficiaryUser = await User.findById(payment.beneficiary).select('_id expoPushToken offered totalPoints');

            if (payerUser) {
                payerUser.seeked = (payerUser.seeked || 0) + 1;
                payerUser.totalPoints = (payerUser.totalPoints || 0) + totalPoints;
                await payerUser.save();
            }

            if (beneficiaryUser) {
                beneficiaryUser.offered = (beneficiaryUser.offered || 0) + 1;
                beneficiaryUser.totalPoints = (beneficiaryUser.totalPoints || 0) + totalPoints;
                await beneficiaryUser.save();
            }

            // Notify beneficiary
            if (beneficiaryUser?.expoPushToken) {
                const payerName = `${payerUser.firstname} ${payerUser.lastname}`;
                await sendNotification(
                    beneficiaryUser,
                    '💰 Payment Received',
                    `${payerName} sent you ${payment.amount} ${payment.currency}.`
                );
            }

            console.log(`[paymentAuditor] Marked completed.`);
        }

        console.log('[paymentAuditor] All pending payments processed successfully.');
    } catch (err) {
        console.error('[paymentAuditor] Worker error:', err);
    } finally {
        isProcessing = false;
    }
};

// Run every 1min (for testing)
setInterval(processPendingPayments, 60000);
console.log('[paymentAuditor] Worker started — checking every 1 min...');