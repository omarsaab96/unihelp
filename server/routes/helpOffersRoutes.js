// routes/helpOffers.js
const express = require("express");
const router = express.Router();
const HelpOffer = require("../models/HelpOffer");
const Tutor = require("../models/Tutor");
const Wallet = require("../models/Wallet");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Bid = require("../models/Bid");
const authMiddleware = require("../utils/middleware/auth");
const { ObjectId } = require("mongoose").Types;
const { sendNotification } = require("../utils/notificationService");

// GET /helpOffers?q=math&page=1&limit=10&subject=...&helpType=...&sortBy=price&sortOrder=asc
router.get("/", async (req, res) => {
  try {
    const {
      userRole,
      university,
      q,
      page = 1,
      limit = 10,
      subject,
      skills,
      helpType,
      availability,
      priceRange,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
        { skills: { $regex: q, $options: "i" } },
      ];
    }

    if (subject) query.subject = { $regex: subject, $options: "i" };
    if (helpType) query.helpType = helpType;
    if (availability) query.availability = { $gte: new Date(availability) };

    if (priceRange) {
      if (priceRange === "free") query.price = 0;
      else if (priceRange === "20+") query.price = { $gte: 20 };
      else {
        const [min, max] = priceRange.split("-").map(Number);
        query.price = { $gte: min, $lte: max };
      }
    }

    const sortField = sortBy === "price" ? "price" : sortBy === "rating" ? "rating" : "createdAt";

    const offers = await HelpOffer.aggregate([
      // 1. Join User
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user"
        }
      },

      // 2. Unwind user array
      { $unwind: "$user" },

      // 3. Filter by user.type === partition
      {
        $match: {
          "user.role": userRole,
          "user.university": new ObjectId(university),
          ...query // other filters like category, university etc.
        }
      },

      // 4. Sorting
      {
        $sort: { [sortField]: sortOrder === "asc" ? 1 : -1 }
      },

      // 5. Pagination
      { $skip: (page - 1) * limit },
      { $limit: Number(limit) },

      // 6. Populate bids
      {
        $lookup: {
          from: "bids",
          localField: "bids",
          foreignField: "_id",
          as: "bids"
        }
      },

      // 7. Populate bids.user
      {
        $lookup: {
          from: "users",
          localField: "bids.user",
          foreignField: "_id",
          as: "bidUsers"
        }
      },

      // 8. Attach bid users to each bid
      {
        $addFields: {
          bids: {
            $map: {
              input: "$bids",
              as: "bid",
              in: {
                $mergeObjects: [
                  "$$bid",
                  {
                    user: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$bidUsers",
                            as: "bu",
                            cond: { $eq: ["$$bu._id", "$$bid.user"] }
                          }
                        },
                        0
                      ]
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // 9. Clean the lookup junk
      { $project: { bidUsers: 0 } }
    ]);


    const total = await HelpOffer.countDocuments(query);

    res.json({
      data: offers,
      total: offers.length,
      page: Number(page),
      hasMore: page * limit < offers.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST Create a new offer
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      subject,
      skills,
      helpType,
      price,
      priceMin,
      priceMax,
      type
    } = req.body;

    const userId = req.user.id;

    if (!title || !subject || !helpType || !type || !skills) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let newOffer = null;

    if (type == "offer") {
      newOffer = new HelpOffer({
        title,
        description,
        subject,
        skills,
        helpType,
        price: price ?? 0,
        user: userId,
        type: "offer"
      });
    }

    if (type == "seek") {
      newOffer = new HelpOffer({
        title,
        description,
        subject,
        skills,
        helpType,
        duration,
        priceMin: priceMin ?? 0,
        priceMax: priceMax ?? 0,
        user: userId,
        type: "seek"
      });
    }

    await newOffer.save();

    if (helpType === "tutoring") {
      // Check if tutor exists
      const existingTutor = await Tutor.findOne({ user: userId });
      if (!existingTutor) {
        const newTutor = new Tutor({
          user: userId,
          subjects: [subject],
        });
        await newTutor.save();
      } else {
        // Optionally update subjects and availability
        if (!existingTutor.subjects.includes(subject)) {
          existingTutor.subjects.push(subject);
        }
        await existingTutor.save();
      }
    }

    res.status(201).json({
      message: "Help offer created successfully",
      offer: newOffer,
    });
  } catch (err) {
    console.error("Error creating offer:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /helpOffers/:id → get one help offer by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await HelpOffer.findById(id)
      .populate("user", "_id firstname lastname photo role helpjobs rating reviews")
      .populate({
        path: "bids",
        populate: { path: "user", select: "_id firstname lastname photo rating reviews" },
      });

    if (!offer) {
      return res.status(404).json({ message: "Help offer not found." });
    }

    const acceptedBid = await Bid.findOne({
      offer: id,
      acceptedAt: { $ne: null },
    }).populate("user", "_id firstname lastname photo helpjobs rating reviews");

    const offerWithAcceptedBid = {
      ...offer.toObject(),
      acceptedBid: acceptedBid || null,
    };

    res.status(200).json(offerWithAcceptedBid);
  } catch (err) {
    console.error("❌ Error fetching help offer:", err);
    res.status(500).json({ message: "Server error while fetching help offer." });
  }
});

// PATCH /helpOffers/:offerid/bids/:bidid/accept
router.patch("/:offerid/bids/:bidid/accept", authMiddleware, async (req, res) => {
  try {
    const { offerid, bidid } = req.params;
    const userId = req.user.id || req.user._id;

    // 1️⃣ Find the offer
    const offer = await HelpOffer.findById(offerid);
    if (!offer) return res.status(404).json({ message: "Offer not found." });

    // 2️⃣ Ensure the logged-in user is the owner of the offer
    if (offer.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You are not authorized to choose a candidate for this offer." });
    }

    // 3️⃣ Find the bid
    const bid = await Bid.findOne({ _id: bidid, offer: offerid });
    if (!bid) return res.status(404).json({ message: "Bid not found for this offer." });

    // 4️⃣ Wallet check for payer. case: 'seek' => owner should pay, case: 'offer' => bidder should pay
    if (offer.type == 'seek') {
      const ownerWallet = await Wallet.findOne({ user: userId });
      if (!ownerWallet) {
        return res.status(400).json({ message: "Owner wallet not found." });
      }

      // 💰 Calculate total cost of bid (hours * rate)
      const totalCost = bid.duration * bid.amount;

      // ⚠️ Check available balance
      if (ownerWallet.availableBalance < totalCost) {
        return res.status(400).json({
          message: `Insufficient funds. Topup your wallet from your profile.\nYou need: ₺${totalCost}`,
        });
      }

      ownerWallet.availableBalance -= totalCost;
      await ownerWallet.save();
    }

    // 5️⃣ Mark the bid as accepted
    if (bid.acceptedAt) {
      return res.status(400).json({ message: "This bid has already been accepted." });
    }

    bid.acceptedAt = new Date();
    await bid.save();

    // 6️⃣ Mark the offer as closed if it is a 'seek' help offer
    if (offer.type == 'seek') {
      offer.closedAt = new Date();
      await offer.save();
    }

    // 7️⃣ Populate user info for frontend
    const populatedBid = await bid.populate("user", "_id firstname lastname photo rating reviews");

    // 8️⃣ Add to both users' helpjobs
    await User.findByIdAndUpdate(
      populatedBid.user._id,
      {
        $push: {
          helpjobs: { offer: offerid, status: "open", agreedPrice: bid.amount, agreedDuration: bid.duration },
        },
      },
      { new: true }
    );
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          helpjobs: { offer: offerid, status: "open", agreedPrice: bid.amount, agreedDuration: bid.duration },
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Candidate chosen successfully.",
      acceptedBid: populatedBid,
      closedOffer: offer,
    });
  } catch (err) {
    console.error("Error choosing candidate:", err);
    res.status(500).json({ message: "Server error while choosing candidate." });
  }
});

// PATCH /helpOffers/:offerid/bids/:bidid/reject
router.patch("/:offerid/bids/:bidid/reject", authMiddleware, async (req, res) => {
  try {
    const { offerid, bidid } = req.params;
    const userId = req.user.id || req.user._id;

    // 1️⃣ Find the offer
    const offer = await HelpOffer.findById(offerid);
    if (!offer) return res.status(404).json({ message: "Offer not found." });

    // 2️⃣ Ensure the logged-in user is the owner of the offer
    if (offer.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You are not authorized to reject a request for this offer." });
    }

    // 3️⃣ Find the bid
    const bid = await Bid.findOne({ _id: bidid, offer: offerid });
    if (!bid) return res.status(404).json({ message: "Bid not found for this offer." });

    // 5️⃣ Mark the bid as rejected
    if (bid.rejectedAt) {
      return res.status(400).json({ message: "This bid has already been rejected." });
    }

    bid.rejectedAt = new Date();
    await bid.save();

    // 7️⃣ Populate user info for frontend
    const populatedBid = await bid.populate("user", "_id firstname lastname photo rating reviews");

    res.status(200).json({
      message: "Candidate chosen successfully.",
      rejectedBid: populatedBid,
    });
  } catch (err) {
    console.error("Error rejecting request:", err);
    res.status(500).json({ message: "Server error while rejecting request." });
  }
});

// POST /helpOffers/:offerid/bids
router.post("/:offerid/bids", authMiddleware, async (req, res) => {
  try {
    const { offerid } = req.params;
    const { message, duration, amount } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Bid message is required." });
    }

    if (!duration || duration == null) {
      return res.status(400).json({ message: "Bid duration is required." });
    }

    if (!amount || amount == null) {
      return res.status(400).json({ message: "Bid amount is required." });
    }


    // Check if offer exists
    const offer = await HelpOffer.findById(offerid).populate("user");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // Optional: prevent user from bidding twice
    const existingBid = await Bid.findOne({ offer: offerid, user: userId });
    if (existingBid) {
      return res.status(400).json({ message: "You have already placed a bid on this offer." });
    }

    if (offer.type == 'offer') {
      const bidderWallet = await Wallet.findOne({ user: userId });
      if (!bidderWallet) {
        return res.status(400).json({ message: "Bidder wallet not found." });
      }

      // 💰 Calculate total cost of bid (hours * rate)
      const totalCost = duration * offer.price;

      // ⚠️ Check available balance
      if (bidderWallet.availableBalance < totalCost) {
        return res.status(400).json({
          message: `Insufficient funds. Topup your wallet from your profile.\nYou need: ₺${totalCost}`,
        });
      }

      bidderWallet.availableBalance -= totalCost;
      await bidderWallet.save();
    }

    // Create new bid
    const bid = new Bid({
      offer: offerid,
      user: userId,
      message,
      duration,
      amount
    });

    await bid.save();

    // Optionally populate for frontend display
    const populatedBid = await bid.populate("user", "_id firstname lastname photo rating reviews");

    // Push bid to offer if you store references
    await HelpOffer.findByIdAndUpdate(offerid, {
      $push: { bids: bid._id },
    });

    console.log('Send notification requested on Bid creation')
    await sendNotification(
      offer.user,
      `Help Offer: ${offer.title}`,
      `${capitalize(populatedBid.user.firstname)} ${capitalize(populatedBid.user.lastname)} placed a new ${offer.type === "offer" ? "request" : "bid"}`,
      { screen: "helpOfferDetails", data: JSON.stringify(offer) },
      true
    );

    res.status(201).json(populatedBid);
  } catch (err) {
    console.error("Error creating bid:", err);
    res.status(500).json({ message: "Server error while creating bid." });
  }
});

// POST /helpOffers/:offerid/close
router.post("/:offerid/close", authMiddleware, async (req, res) => {
  try {
    const { offerid } = req.params;
    const userId = req.user.id;

    // ✅ 1. Check if offer exists
    const offer = await HelpOffer.findById(offerid);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // ✅ 2. Optional: prevent user from closing if not owner
    if (offer.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You don't have permission to close this offer." });
    }

    // ✅ 3. Mark offer as closed (add closedAt timestamp and status)
    offer.closedAt = new Date();

    await offer.save();

    // ✅ 4. Optionally populate related user info for frontend
    const populatedOffer = await offer.populate("user", "_id firstname lastname photo rating reviews");

    // ✅ 5. Return updated offer
    res.status(200).json({
      message: "Offer closed successfully.",
      data: populatedOffer,
    });
  } catch (err) {
    console.error("Error closing offer:", err);
    res.status(500).json({ message: "Server error while closing offer." });
  }
});


// GET all bids for a specific help offer
router.get("/:offerid/bids", async (req, res) => {
  try {
    const { offerid } = req.params;

    // Make sure the offer exists
    const offer = await HelpOffer.findById(offerid);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // Fetch all bids, newest first
    const bids = await Bid.find({ offer: offerid })
      .populate("user", "_id firstname lastname photo role rating reviews")
      .sort({ createdAt: -1 });

    res.status(200).json(bids);
  } catch (err) {
    console.error("Error fetching bids:", err);
    res.status(500).json({ message: "Server error while fetching bids." });
  }
});

// POST /helpOffers/closeJob/:offerId
router.post("/closeJob/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    // Mark all related helpjobs as completed
    const result = await User.updateMany(
      { "helpjobs.offer": offerId },
      {
        $set: {
          "helpjobs.$.status": "pending",
          "helpjobs.$.completedAt": new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: "Job closed successfully.",
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error("❌ Error closing job:", err);
    res.status(500).json({ message: "Server error while closing job." });
  }
});

// POST /helpOffers/survey/:offerId
router.post("/survey/:offerId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerId } = req.params;
    const {
      gotNeededHelp,
      workDelivered,
      bidderRating,
      ownerRating,
      feedback
    } = req.body

    const date = new Date()

    // 1️⃣ Mark this user's survey date for this offer
    const result = await User.updateOne(
      { _id: userId, "helpjobs.offer": offerId },
      {
        $set: { "helpjobs.$.survey": date },
        "helpjobs.$.feedback": { gotNeededHelp, workDelivered, bidderRating, ownerRating, feedback }   // store the feedback text
      }

    );

    if (!result.modifiedCount) {
      return res.status(404).json({ message: "Help job not found for this user." });
    }

    // 2️⃣ Find both users involved in this offer
    const usersWithSurvey = await User.find({
      "helpjobs.offer": offerId
    }).select("helpjobs offer firstname lastname email");

    // Find both helpjobs entries
    const jobsForThisOffer = usersWithSurvey
      .map((u) => {
        const job = u.helpjobs.find((j) => j.offer.toString() === offerId);
        return job ? { user: u._id, survey: job.survey } : null;
      })
      .filter(Boolean);

    // 3️⃣ Check if both users submitted their survey
    const bothSurveyed = jobsForThisOffer.every((j) => j.survey != null);

    if (!bothSurveyed) {
      return res.json({
        success: true,
        message: "Survey submitted. Waiting for the other user to complete theirs.",
        modified: result.modifiedCount,
        surveyDate: date
      });
    }

    //Both users completed → update helpjob status to "systempending"
    await User.updateMany(
      { "helpjobs.offer": offerId },
      {
        $set: { "helpjobs.$.status": "systempending" }
      }
    );

    // 4️⃣ Both users have completed survey → find accepted bid & offer
    const bid = await Bid.findOne({ offer: offerId, acceptedAt: { $ne: null } })
      .populate("user", "_id firstname lastname rating reviews")
      .lean();

    if (!bid) {
      return res.status(404).json({ message: "Accepted bid not found for this offer." });
    }

    const offer = await HelpOffer.findById(offerId).populate("user", "_id firstname lastname rating reviews");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // 5️⃣ Compute payment info
    const totalAmount = bid.duration * bid.amount;

    // 6️⃣ Create a pending payment
    const paymentObject = {
      beneficiary: offer.type == 'seek' ? bid.user._id : offer.user._id,
      payer: offer.type == 'seek' ? offer.user._id : bid.user._id,
      amount: totalAmount,
      currency: "TRY",
      type: "jobdone",
      note: "offerId: " + offerId + ". BidId: " + bid._id,
      status: "pending",
    };

    const payment = await Payment.create(paymentObject);

    // 7️⃣ Return response
    res.json({
      success: true,
      message: "Survey submitted. Both surveys received, payment pending.",
      payment,
      modified: result.modifiedCount,
      surveyDate: date
    });
  } catch (err) {
    console.error("❌ Error closing job:", err);
    res.status(500).json({ message: "Server error while closing job." });
  }
});


const capitalize = (str = "") =>
  str
    .toString()
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join(" ");


module.exports = router;
