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

            const payerUser = await User.findById(payment.payer).select('_id firstname lastname seeked totalPoints helpjobs reviews rating');
            const beneficiaryUser = await User.findById(payment.beneficiary).select('_id expoPushToken offered totalPoints helpjobs reviews rating');
            const offerId = payment.note.split(".")[0];
            const rawId = offerId.split(':')[1].trim();
            const payerJob = payerUser.helpjobs.find(h => h.offer.toString() === rawId);
            const beneficiaryJob = beneficiaryUser.helpjobs.find(h => h.offer.toString() === rawId);
            const helpOffer = await HelpOffer.findById(rawId)
                .populate({
                    path: "bids",
                    populate: { path: "user", select: "_id firstname lastname photo" },
                });

            // ********** 0- VALIDATIONS *************
            // check if both users are available
            if (!payerUser || !beneficiaryUser) {
                console.log('Some users not found')
                if (helpOffer.type == 'seek') {
                    helpOffer.systemRejected = new Date(2500);
                    await helpOffer.save();
                }
                if (helpOffer.type == 'offer') {
                    payerJob.systemRejected = new Date(2500);
                    await payerUser.save();
                    beneficiaryJob.systemRejected = new Date(2500);
                    await beneficiaryUser.save();
                }
                return;
            }

            if (!payerJob || !beneficiaryJob) {
                console.log('Some jobs not found')
                if (helpOffer.type == 'seek') {
                    helpOffer.systemRejected = new Date();
                    await helpOffer.save();
                }
                if (helpOffer.type == 'offer') {
                    payerJob.systemRejected = new Date();
                    await payerUser.save();
                    beneficiaryJob.systemRejected = new Date();
                    await beneficiaryUser.save();
                }
                return;
            }

            // check if both submitted Feedback
            if (payerJob.survey == null || beneficiaryJob.survey == null) {
                console.log('Some surveys are still pending submission')
                if (helpOffer.type == 'seek') {
                    helpOffer.systemRejected = new Date();
                    await helpOffer.save();
                }
                if (helpOffer.type == 'offer') {
                    payerJob.systemRejected = new Date();
                    await payerUser.save();
                    beneficiaryJob.systemRejected = new Date();
                    await beneficiaryUser.save();
                }
                return;
            }

            if (!helpOffer) {
                console.log("Offer not found");
                if (helpOffer.type == 'seek') {
                    helpOffer.systemRejected = new Date();
                    await helpOffer.save();
                }
                if (helpOffer.type == 'offer') {
                    payerJob.systemRejected = new Date();
                    await payerUser.save();
                    beneficiaryJob.systemRejected = new Date();
                    await beneficiaryUser.save();
                }
                return;
            }

            // check if there is a dispute
            const payerGotNeededHelp = payerJob?.feedback?.gotNeededHelp === true;
            const payerWorkDelivered = payerJob?.feedback?.workDelivered === true;

            const beneficiaryGotNeededHelp = beneficiaryJob?.feedback?.gotNeededHelp === true;
            const beneficiaryWorkDelivered = beneficiaryJob?.feedback?.workDelivered === true;

            const bothGotNeededHelp = payerGotNeededHelp && beneficiaryGotNeededHelp;
            const bothWorkDelivered = payerWorkDelivered && beneficiaryWorkDelivered;


            if (!bothGotNeededHelp || !bothWorkDelivered) {
                console.log('Dispute happening')
                return;
            }

            // TODO check if both chatted

            // ********** 1 - OFFER UPDATES *************
            let totalPoints = 0;
            if (helpOffer.type == 'seek') {
                const acceptedBid = helpOffer.bids.find(b => b.acceptedAt != null);
                totalPoints = acceptedBid.duration * 60;

                helpOffer.systemApproved = new Date();
                await helpOffer.save()
            }

            if (helpOffer.type == 'offer') {
                const acceptedBid = helpOffer.bids.find(b =>
                    String(b.user?._id || b.user) === String(payerUser._id)
                );
                if (!acceptedBid) {
                    console.log('[paymentAuditor] No accepted bid found for type=offer', {
                        offerId: helpOffer._id,
                        payer: payerUser._id
                    });
                    continue; // skip instead of crashing
                }
                totalPoints = acceptedBid.duration * 60;


                payerJob.systemApproved = new Date();
                await payerUser.save();
                beneficiaryJob.systemApproved = new Date();
                await beneficiaryUser.save();
            }

            // ********** 2 - USERS UPDATES *************
            if (payerUser) {
                payerUser.seeked = (payerUser.seeked || 0) + 1;
                payerUser.totalPoints = (payerUser.totalPoints || 0) + totalPoints;
                const oldrating = (payerUser.rating || 0);
                const oldreviews = (payerUser.reviews || 0);
                const newRating = beneficiaryJob.feedback.ownerRating;
                const newAvgRating = ((oldrating * oldreviews) + newRating) / (oldreviews + 1)

                payerUser.rating = newAvgRating;
                payerUser.rating = oldreviews + 1;
                await payerUser.save();
            }

            if (beneficiaryUser) {
                beneficiaryUser.offered = (beneficiaryUser.offered || 0) + 1;
                beneficiaryUser.totalPoints = (beneficiaryUser.totalPoints || 0) + totalPoints;
                const oldrating = (beneficiaryUser.rating || 0);
                const oldreviews = (beneficiaryUser.reviews || 0);
                const newRating = payerJob.feedback.ownerRating;
                const newAvgRating = ((oldrating * oldreviews) + newRating) / (oldreviews + 1)

                beneficiaryUser.rating = newAvgRating;
                beneficiaryUser.rating = oldreviews + 1;
                await beneficiaryUser.save();
            }

            // ********** 3 - WALLETS UPDATES *************
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


            // ********** 4 - NOTIFY BENEFICIARY *************
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