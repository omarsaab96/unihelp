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

// GET /helpOffers?q=math&page=1&limit=10&subject=...&helpType=...&sortBy=price&sortOrder=asc
router.get("/", async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 10,
      subject,
      helpType,
      availability,
      priceRange,
      sortBy = "date",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { subject: { $regex: q, $options: "i" } },
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

    const sortField =
      sortBy === "price" ? "price" : sortBy === "rating" ? "rating" : "createdAt";

    const offers = await HelpOffer.find(query)
      .populate("user", "_id firstname lastname photo")
      .populate({
        path: "bids",
        populate: { path: "user", select: "_id firstname lastname photo" },
      })
      .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await HelpOffer.countDocuments(query);

    res.json({
      data: offers,
      total,
      page: Number(page),
      hasMore: page * limit < total,
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
      subject,
      helpType,
      price,
      priceMin,
      priceMax,
      type
    } = req.body;

    const userId = req.user.id;

    if (!title || !subject || !helpType || !type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let newOffer = null;

    if (type == "offer") {
      newOffer = new HelpOffer({
        title,
        description,
        subject,
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
        helpType,
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
      .populate("user", "_id firstname lastname photo role helpjobs")
      .populate({
        path: "bids",
        populate: { path: "user", select: "_id firstname lastname photo" },
      });

    if (!offer) {
      return res.status(404).json({ message: "Help offer not found." });
    }

    const acceptedBid = await Bid.findOne({
      offer: id,
      acceptedAt: { $ne: null },
    }).populate("user", "_id firstname lastname photo helpjobs");

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

    // 4️⃣ Wallet check for offer owner
    const ownerWallet = await Wallet.findOne({ user: userId });
    if (!ownerWallet) {
      return res.status(400).json({ message: "Owner wallet not found." });
    }

    // 💰 Calculate total cost of bid (weeks * days * hours * rate)
    const totalCost = bid.duration * 7 * 8 * bid.amount;

    // ⚠️ Check available balance
    if (ownerWallet.availableBalance < totalCost) {
      return res.status(400).json({
        message: `Insufficient funds. Topup your wallet from your profile.`,
      });
    }

    ownerWallet.availableBalance -= totalCost;
    await ownerWallet.save();

    // 5️⃣ Mark the bid as accepted
    if (bid.acceptedAt) {
      return res.status(400).json({ message: "This bid has already been accepted." });
    }

    bid.acceptedAt = new Date();
    await bid.save();

    // 6️⃣ Mark the offer as closed
    offer.closedAt = new Date();
    await offer.save();

    // 7️⃣ Populate user info for frontend
    const populatedBid = await bid.populate("user", "_id firstname lastname photo");

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
    const offer = await HelpOffer.findById(offerid);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // Optional: prevent user from bidding twice
    // const existingBid = await Bid.findOne({ offer: offerid, user: userId });
    // if (existingBid) {
    //   return res.status(400).json({ message: "You have already placed a bid on this offer." });
    // }

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
    const populatedBid = await bid.populate("user", "_id firstname lastname photo");

    // Push bid to offer if you store references
    await HelpOffer.findByIdAndUpdate(offerid, {
      $push: { bids: bid._id },
    });

    res.status(201).json(populatedBid);
  } catch (err) {
    console.error("Error creating bid:", err);
    res.status(500).json({ message: "Server error while creating bid." });
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
      .populate("user", "_id firstname lastname photo role")
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
          "helpjobs.$.status": "completed",
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

    const date = new Date()

    // 1️⃣ Mark this user's survey date for this offer
    const result = await User.updateOne(
      { _id: userId, "helpjobs.offer": offerId },
      { $set: { "helpjobs.$.survey": date } }
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

    // 4️⃣ Both users have completed survey → find accepted bid & offer
    const bid = await Bid.findOne({ offer: offerId, acceptedAt: { $ne: null } })
      .populate("user", "_id firstname lastname")
      .lean();

    if (!bid) {
      return res.status(404).json({ message: "Accepted bid not found for this offer." });
    }

    const offer = await HelpOffer.findById(offerId).populate("user", "_id firstname lastname");

    if (!offer) {
      return res.status(404).json({ message: "Offer not found." });
    }

    // 5️⃣ Compute payment info
    const totalAmount = bid.duration * 7 * 8 * bid.amount;

    // 6️⃣ Create a pending payment
    const paymentObject = {
      beneficiary: bid.user._id,
      payer: offer.user._id,
      amount: totalAmount,
      currency: "TRY",
      type: "jobdone",
      note: "offerId: "+offerId+". BidId: "+ bid._id,
      status: "pending",
    };

    const payment = await Payment.create(paymentObject);

    // 7️⃣ Return response
    res.json({
      success: true,
      message: "Survey submitted. Both surveys received, payment pending creation.",
      payment,
      modified: result.modifiedCount,
      surveyDate: date
    });
  } catch (err) {
    console.error("❌ Error closing job:", err);
    res.status(500).json({ message: "Server error while closing job." });
  }
});



module.exports = router;
