// routes/helpOffers.js
const express = require("express");
const router = express.Router();
const HelpOffer = require("../models/HelpOffer");
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
      availability,
      price,
    } = req.body;

    // attach logged-in user automatically (if using auth middleware)
    console.log(req.user.id)
    const userId = req.user.id;

    if (!title || !description || !subject || !helpType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newOffer = new HelpOffer({
      title,
      description,
      subject,
      helpType,
      availability: {
        date: availability.days,
        startTime: availability.startTime,
        endTime: availability.endTime
      },
      price: price ?? 0,
      user: userId,
    });

    await newOffer.save();

    res.status(201).json({
      message: "Help offer created successfully",
      offer: newOffer,
    });
  } catch (err) {
    console.error("Error creating offer:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
