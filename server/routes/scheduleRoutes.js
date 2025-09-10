const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Team = require('../models/Team');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationService');


// Middleware: JWT Authentication
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token, authorization denied'
            });
        }

        const decoded = jwt.verify(token, '123456');
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Middleware: Role-Based Authorization
const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (req.user.type === 'Club') return next();
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }
        next();
    };
};

// Middleware: Team Membership Check
const checkTeamMembership = async (req, res, next) => {
    try {
        const teamId = req.params.teamId || req.body.team;
        if (!teamId) return next();

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        const isAdmin = team.club.toString() === req.user._id.toString();
        const isCoach = team.coaches.some(c => c.toString() === req.user._id.toString());
        const isMember = team.members.some(m => m.toString() === req.user._id.toString());

        if (isAdmin || isCoach || isMember) {
            req.team = team;
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'Not a team member'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Middleware: Event Ownership Check
const checkEventOwnership = async (req, res, next) => {
    try {
        const event = await Schedule.findById(req.params.id);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        const isAdmin = event.club.toString() === req.user._id.toString();
        const isCreator = event.createdBy.toString() === req.user._id.toString();
        const isCoach = event.coaches.some(c => c.toString() === req.user._id.toString());

        if (isAdmin || isCreator || isCoach) {
            req.event = event;
            return next();
        }

        res.status(403).json({
            success: false,
            message: 'Not authorized to modify this event'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Middleware: Request Validation
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);

        if (errors.isEmpty()) return next();

        res.status(400).json({
            success: false,
            errors: errors.array()
        });
    };
};

// @route   GET /api/schedules
// @desc    Get all events for a club with filters (private access)
router.get('/', authenticate, async (req, res) => {
    try {
        const { team, startDate, endDate, eventType } = req.query;
        const filters = {
            club: req.user._id,
            status: { $ne: 'cancelled' }
        };

        if (team) filters.team = team;
        if (eventType) filters.eventType = eventType;
        if (startDate && endDate) {
            filters.startDateTime = { $gte: new Date(startDate) };
            filters.endDateTime = { $lte: new Date(endDate) };
        }

        const events = await Schedule.find(filters)
            .populate('team', 'name sport ageGroup')
            .populate('participants.user', 'name image')
            .populate('coaches', 'name image')
            .sort({ startDateTime: 1 });

        res.json({ success: true, data: events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/schedules/club/:clubId
// @desc    Get all events for a specific club (public access)
router.get('/club/:clubId', async (req, res) => {
    try {
        const { team, startDate, endDate, eventType } = req.query;
        const filters = {
            club: req.params.clubId,
            status: { $ne: 'cancelled' }
        };

        if (team) filters.team = team;
        if (eventType) filters.eventType = eventType;
        if (startDate && endDate) {
            filters.startDateTime = { $gte: new Date(startDate) };
            filters.endDateTime = { $lte: new Date(endDate) };
        }

        const events = await Schedule.find(filters)
            .populate('team', 'name sport ageGroup')
            .populate('participants.user', 'name image')
            .populate('coaches', 'name image')
            .sort({ startDateTime: 1 });

        res.json({ success: true, data: events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/schedules
// @desc    Create a new event
// @access  Private (Club admins/coaches)
router.post('/',
    authenticate,
    authorize(['admin', 'coach']),
    checkTeamMembership,
    validate([
        check('title', 'Title is required').not().isEmpty(),
        check('startDateTime', 'Valid start date required').isISO8601(),
        check('endDateTime', 'Valid end date required').isISO8601(),
        check('team', 'Team ID is required').isMongoId(),
        check('eventType', 'Invalid event type').isIn([
            'Training', 'Match', 'Meeting', 'Tournament', 'Other'
        ])
    ]),
    async (req, res) => {
        try {
            const { title, description, startDateTime, endDateTime, eventType, team, ...rest } = req.body;

            if (new Date(endDateTime) <= new Date(startDateTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'End date must be after start date'
                });
            }

            const newEvent = new Schedule({
                title,
                description,
                startDateTime,
                endDateTime,
                eventType,
                team,
                club: req.user._id,
                createdBy: req.user._id,
                ...rest
            });

            await newEvent.save();
            const populatedEvent = await Schedule.findById(newEvent._id)
                .populate('team', 'name sport ageGroup members coaches club')
                .populate('createdBy', 'name type');

            console.log(populatedEvent.team.coaches)

            // Notification logic
            const creatorType = populatedEvent.createdBy.type;
            const teamData = populatedEvent.team;

            let usersToNotify = [];

            if (creatorType == 'Coach') {
                // Notify team members and the club
                usersToNotify = await User.find({
                    _id: { $in: [...teamData.members, teamData.club] },
                    expoPushToken: { $exists: true, $ne: null }
                });
            } else if (creatorType == 'Club') {
                // Notify team members and coaches
                usersToNotify = await User.find({
                    _id: { $in: [...teamData.members, ...teamData.coaches] },
                    expoPushToken: { $exists: true, $ne: null }
                });
            }

            const notificationTitle = `📅 New Event`;
            const notificationBody = `You have a new ${eventType} scheduled for ${formatDateTime(startDateTime)}.`;

            console.log("usersToNotify= ", usersToNotify)

            // Send notifications one by one (can be optimized with batching)
            for (const user of usersToNotify) {
                try {
                    await sendNotification(
                        user,
                        notificationTitle,
                        notificationBody,
                        { eventId: newEvent._id.toString() });
                } catch (err) {
                    console.error(`Failed to send notification to user ${user._id}:`, err.message);
                }
            }

            res.status(201).json({ success: true, data: populatedEvent });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// @route   GET /api/schedules/:id
// @desc    get a specific event
router.get('/:id', async (req, res) => {
    try {
        const eventId= req.params.id;

        const event = await Schedule.findById(eventId);

        if (!event) {
            res.status(404).json({ success: false, message: 'Event not found' });
        }

        res.status(200).json({ success: true, data: event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
);

// @route   PUT /api/schedules/:id
// @desc    Update an event
// @access  Private (Club admins/coaches)
router.put('/:id',
    authenticate,
    authorize(['admin', 'coach']),
    checkEventOwnership,
    async (req, res) => {
        try {
            if (req.event.status === 'completed') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot modify completed events'
                });
            }

            const updates = req.body;
            Object.keys(updates).forEach(key => {
                if (key !== '_id' && key !== 'club' && key !== 'createdBy') {
                    req.event[key] = updates[key];
                }
            });

            await req.event.save();
            const populatedEvent = await Schedule.findById(req.event._id)
                .populate('team', 'name sport ageGroup')
                .populate('participants.user', 'name image')
                .populate('coaches', 'name image');

            res.json({ success: true, data: populatedEvent });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// @route   DELETE /api/schedules/:id
// @desc    Cancel an event
// @access  Private (Club admins/coaches)
router.delete('/:id',
    authenticate,
    authorize(['admin', 'coach']),
    checkEventOwnership,
    async (req, res) => {
        try {
            req.event.status = 'cancelled';
            await req.event.save();
            res.json({ success: true, data: {} });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// @route   POST /api/schedules/:id/rsvp
// @desc    RSVP to an event
// @access  Private (Team members)
router.post('/:id/rsvp',
    authenticate,
    checkTeamMembership,
    validate([
        check('status', 'Valid RSVP status required').isIn([
            'pending', 'confirmed', 'declined', 'tentative'
        ])
    ]),
    async (req, res) => {
        try {
            const { status } = req.body;
            const participantIndex = req.event.participants.findIndex(
                p => p.user.toString() === req.user._id.toString()
            );

            if (participantIndex >= 0) {
                req.event.participants[participantIndex].status = status;
                req.event.participants[participantIndex].responseDate = new Date();
            } else {
                req.event.participants.push({
                    user: req.user._id,
                    status,
                    responseDate: new Date()
                });
            }

            await req.event.save();
            res.json({ success: true, data: req.event.participants });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// @route   GET /api/schedules/team/:teamId
// @desc    Get events for a specific team
// @access  Private (Team members)
router.get('/team/:teamId',
    authenticate,
    async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const filters = {
                team: req.params.teamId,
                status: { $ne: 'cancelled' }
            };

            if (startDate && endDate) {
                filters.startDateTime = { $gte: new Date(startDate) };
                filters.endDateTime = { $lte: new Date(endDate) };
            }

            const events = await Schedule.find(filters)
                .populate('team', 'name sport')
                .sort({ startDateTime: 1 });

            res.json({ success: true, data: events });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);


function formatDateTime(dateInput) {
    const date = new Date(dateInput);

    const pad = (num) => num.toString().padStart(2, '0');

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); // Months are zero-based
    const year = date.getFullYear();

    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}/${month}/${year} at ${hours}:${minutes}`;
}

module.exports = router;