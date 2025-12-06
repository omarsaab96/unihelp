// routes/sponsor.js
const express = require("express");
const router = express.Router();
const Sponsor = require("../models/Sponsor");
const Offer = require("../models/Offer");
const authMiddleware = require("../utils/middleware/auth");

// Get all sponsors (only linked = true)
router.get("/", async (req, res) => {
    try {
        const sponsors = await Sponsor.find({ linked: true }).populate("offers").sort({ createdAt: -1 });
        res.json({ data: sponsors });
    } catch (error) {
        console.error("Error fetching sponsors:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get a specific sponsor
router.get("/:id", async (req, res) => {
    try {
        const sponsor = await Sponsor.findById(req.params.id).populate("offers");

        if (!sponsor) {
            return res.status(404).json({ message: "Sponsor not found" });
        }

        res.json({ data: sponsor });
    } catch (err) {
        console.error("Error fetching sponsor:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get only linked & featured sponsors
router.get("/featured", async (req, res) => {
    try {
        const sponsors = await Sponsor.find({ linked: true, featured: true }).sort({ createdAt: -1 });
        res.json({ data: sponsors });
    } catch (error) {
        console.error("Error fetching featured sponsors:", error);
        res.status(500).json({ error: "Server error" });
    }
});

//create a sponsor with admin ony access
router.post("/", authMiddleware, async (req, res) => {
    try {
        // Make sure user is admin
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const sponsor = new Sponsor(req.body);
        await sponsor.save();
        res.status(201).json(sponsor);
    } catch (error) {
        console.error("Error creating sponsor:", error);
        res.status(400).json({ error: error.message });
    }
});

//update sponsor
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const sponsor = await Sponsor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!sponsor) {
            return res.status(404).json({ error: "Sponsor not found" });
        }

        res.json(sponsor);
    } catch (error) {
        console.error("Error updating sponsor:", error);
        res.status(400).json({ error: error.message });
    }
});

// Soft delete sponsor (set linked = false)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const sponsor = await Sponsor.findByIdAndUpdate(
            req.params.id,
            { linked: false },
            { new: true }
        );

        if (!sponsor) {
            return res.status(404).json({ error: "Sponsor not found" });
        }

        res.json({ message: "Sponsor soft deleted successfully", sponsor });
    } catch (error) {
        console.error("Error soft deleting sponsor:", error);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;
