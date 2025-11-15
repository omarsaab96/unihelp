const express = require("express");
const router = express.Router();
const Club = require("../models/Club");
const authMiddleware = require("../utils/middleware/auth");

// ✅ Create a new club
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, description, image, category } = req.body;

        const club = new Club({
            name,
            description,
            image,
            category,
            createdBy: req.user.id,
            members: [req.user.id], // creator auto-joins
        });

        await club.save();
        res.status(201).json(club);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /clubs?q=&page=&limit=&date=&startTime=&endTime=&category=&sortBy=&sortOrder=
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            q,
            page = 1,
            limit = 10,
            category,
            sortBy = 'date',
            sortOrder = 'asc'
        } = req.query;

        const query = {};

        // keyword search (name or description)
        if (q && q.trim() !== '') {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        // category filter
        if (category && category.trim() !== '') {
            query.category = { $regex: category, $options: 'i' };
        }

        // sorting
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [clubs, total] = await Promise.all([
            Club.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit)),
            Club.countDocuments(query)
        ]);

        res.json({
            data: clubs,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            hasMore: skip + clubs.length < total
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ✅ Get single club by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")
            .populate("members", "_id firstname lastname email photo");

        if (!club) return res.status(404).json({ message: "Club not found" });

        res.json(club);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Join a club
router.patch("/:id/join", authMiddleware, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        if (club.members.includes(req.user.id))
            return res.status(400).json({ message: "Already a member" });

        club.members.push(req.user.id);
        await club.save();

        res.json({ message: "Joined successfully", club });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Leave a club
router.patch("/:id/leave", authMiddleware, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        club.members = club.members.filter(
            (m) => m.toString() !== req.user.id
        );

        await club.save();
        res.json({ message: "Left the club", club });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Delete a club (only creator)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        if (club.createdBy.toString() !== req.user.id)
            return res.status(403).json({ message: "Not authorized" });

        await club.deleteOne();
        res.json({ message: "Club deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
