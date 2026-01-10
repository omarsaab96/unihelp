const express = require("express");
const router = express.Router();
const Club = require("../models/Club");
const User = require("../models/User");
const authMiddleware = require("../utils/middleware/auth");
const { sendNotification } = require("../utils/notificationService");

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
            admin: req.user.id //by default the creator is presiend and admin
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
            sortOrder = 'desc'
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
            Club.find(query)
                .populate("createdBy", "_id firstname lastname email photo")
                .populate("admin", "_id firstname lastname email photo")
                .populate("announcements.createdBy", "_id firstname lastname email photo")
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit)),
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
            .populate("members", "_id firstname lastname email photo")
            .populate("announcements.createdBy", "_id firstname lastname email photo");


        if (!club) return res.status(404).json({ message: "Club not found" });

        res.json(club);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Join a club
router.patch("/:id/join", authMiddleware, async (req, res) => {
    try {
        const joiningUser = await User.findById(req.user.id);
        if (!joiningUser) return res.status(404).json({ message: "Joining user not found" });

        const club = await Club.findById(req.params.id)
            .populate("createdBy", "-password")
            .populate("admin", "-password");
        if (!club) return res.status(404).json({ message: "Club not found" });

        if (club.members.includes(req.user.id)) {
            console.log("Already a member")
            return res.status(400).json({ message: "Already a member" });
        }

        club.members.push(req.user.id);
        await club.save();

        console.log('Send notification requested on Club student join')
        await sendNotification(
            club.createdBy,
            club.name,
            `${capitalize(joiningUser.firstname)} ${capitalize(joiningUser.lastname)} joined the club`,
            { screen: "clubDetails", data: JSON.stringify ({_id:req.params.id}) },
            true
        );

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

// ✅ add a member
router.patch("/:id/addMember", authMiddleware, async (req, res) => {
    const { memberEmail } = req.body;

    try {
        // Find club
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Find user by email
        const user = await User.findOne({ email: memberEmail });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if already a member
        if (club.members.includes(user._id)) {
            return res.status(400).json({ message: "Already a member" });
        }

        // Add member
        club.members.push(user._id);
        await club.save();

        console.log('Send notification requested on Club member added')
        await sendNotification(
            user,
            club.name,
            "You are now a member of the club",
            { screen: "clubDetails", data: JSON.stringify({ _id: req.params.id }) },
            true
        );

        // Populate club with full user objects
        const populatedClub = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")

        return res.json({
            message: "Added successfully",
            club: populatedClub,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ remove a member
router.patch("/:id/removeMember", authMiddleware, async (req, res) => {
    const { memberId } = req.body;

    try {
        // Find club
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Find user by email
        const user = await User.findById(memberId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if already a member
        if (!club.members.includes(user._id)) {
            return res.status(400).json({ message: "Already not a member" });
        }

        // remove member
        club.members.pull(user._id);
        await club.save();

        // Populate club with full user objects
        const populatedClub = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")

        return res.json({
            message: "Removed successfully",
            club: populatedClub,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ set admin
router.patch("/:id/setAdmin", authMiddleware, async (req, res) => {
    const { adminEmail } = req.body;

    try {
        // Find club
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Find user by email
        const user = await User.findOne({ email: adminEmail });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if already a member
        if (club.admin == user._id) {
            return res.status(400).json({ message: "Already an admin" });
        }

        // Add member
        club.admin = user._id;
        await club.save();

        console.log('Send notification requested on Club admin set')
        await sendNotification(
            user,
            club.name,
            "You are now the admin of the club",
            { screen: "clubDetails", data: JSON.stringify({ _id: req.params.id }) },
            true
        );

        // Populate club with full user objects
        const populatedClub = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")

        return res.json({
            message: "Set admin successfully",
            club: populatedClub,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ remove admin
router.patch("/:id/removeadmin", authMiddleware, async (req, res) => {
    try {
        // Find club
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Add member
        club.admin = club.createdBy;
        await club.save();

        // Populate club with full user objects
        const populatedClub = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")

        return res.json({
            message: "Removed admin successfully",
            club: populatedClub,
        });

    } catch (err) {
        console.error(err);
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

// ✅ ADD ANNOUNCEMENT
router.patch("/:id/addAnnouncement", authMiddleware, async (req, res) => {
    const { message } = req.body;

    if (!message || message.trim() === "") {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        // Create announcement object
        const announcement = {
            message,
            createdBy: req.user.id,
            createdAt: new Date()
        };

        // Push announcement
        club.announcements.push(announcement);
        await club.save();

        // Populate for frontend
        const populated = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")
            .populate("members", "_id firstname lastname email photo")
            .populate("announcements.createdBy", "_id firstname lastname email photo");

        return res.json({
            message: "Announcement added successfully",
            club: populated,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ REMOVE ANNOUNCEMENT
router.patch("/:id/removeAnnouncement/:announcementId", authMiddleware, async (req, res) => {
    const { id, announcementId } = req.params;

    try {
        const club = await Club.findById(id);
        if (!club) return res.status(404).json({ message: "Club not found" });

        const announcement = club.announcements.id(announcementId);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        // Remove subdocument
        announcement.remove();
        await club.save();

        // repopulate
        const populated = await Club.findById(club._id)
            .populate("createdBy", "_id firstname lastname email photo")
            .populate("admin", "_id firstname lastname email photo")
            .populate("members", "_id firstname lastname email photo")
            .populate("announcements.createdBy", "_id firstname lastname email photo");

        return res.json({
            message: "Announcement removed successfully",
            club: populated,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ LIST ANNOUNCEMENTS
// router.get("/:id/announcements", async (req, res) => {
//     try {
//         const club = await Club.findById(req.params.id)
//             .populate("announcements.createdBy", "_id firstname lastname email photo");

//         if (!club) return res.status(404).json({ message: "Club not found" });

//         return res.json({
//             announcements: club.announcements
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: err.message });
//     }
// });

const capitalize = (str = "") =>
  str
    .toString()
    .split(" ")
    .map(s => s.charAt(0).toUpperCase() + s.substring(1))
    .join(" ");


module.exports = router;
