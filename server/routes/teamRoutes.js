const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const User = require('../models/User');
const jwt = require("jsonwebtoken");
const { sendNotification } = require('../utils/notificationService');


// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, '123456', (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded; // decoded contains userId
    next();
  });
};

// Middleware (for pagination, filtering, etc.)
const advancedResults = (model, populate) => async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = model.find(JSON.parse(queryStr));

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Populate
  if (populate) {
    query = query.populate(populate);
  }

  // Executing query
  const results = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.advancedResults = {
    success: true,
    count: results.length,
    pagination,
    data: results
  };

  next();
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
router.get('/', advancedResults(Team, 'club coaches members'), async (req, res) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('club', 'name image sport')
      .populate('coaches', '_id name image')
      .populate('members', '_id name image gender');

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    res.status(200).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Get teams by club id
// @route   GET /api/teams/club/:id
// @access  Public
router.get('/club/:clubId', authenticateToken, async (req, res) => {

  const filters = { club: req.params.clubId, linked: true };

  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // If user is Association, filter by sport
  if (user.type == "Association" && user.sport) {
    filters.sport = user.sport;
  }

  try {
    const teams = await Team.find(filters)
      // .populate('club', 'name image')
      .populate('coaches', '_id name email image')
    // .populate('members', 'name image');

    res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get teams by coach id
// @route   GET /api/teams/byCoach/:id
// @access  Public
router.get('/byCoach/:coachId', async (req, res) => {
  try {
    const teams = await Team.find({ coaches: req.params.coachId, linked: true }).populate('coaches', '_id name email image');

    res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Create new team
// @route   POST /api/teams
// @access  Private (Club only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    let userType = "";

    try {
      const user = await User.findById(req.user.userId).select('type role');
      if (!user) return res.status(404).json({ error: 'User not found' });
      userType = user.type;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }

    // Check if user is a club
    if (userType !== 'Club') {
      return res.status(403).json({
        success: false,
        message: 'Only clubs can create teams'
      });
    }

    const { name, sport, ageGroup, gender, image, coaches } = req.body;

    // Check if team already exists for this club
    const existingTeam = await Team.findOne({ name, club: req.user.id });
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'Team with this name already exists for your club'
      });
    }

    const teamData = {
      name,
      sport,
      ageGroup,
      gender,
      club: req.user.userId,
      image,
      coaches,
      linked: true,
      lastLinked: null
    };

    const team = await Team.create(teamData);

    // Add team to club's teams array
    await User.findByIdAndUpdate(
      req.user.userId,
      { $push: { teams: team._id } },
      { new: true }
    );

    res.status(201).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (Club admin or coach)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify ownership or coach assignment
    if (team.club.toString() !== req.user.userId && (!team.coaches || team.coaches.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this team'
      });
    }

    const { name, sport, ageGroup, gender, image } = req.body;
    const updateData = { name, sport, ageGroup, gender, image };

    team = await Team.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Club admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify ownership
    if (team.club.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this team'
      });
    }

    if (team.members && team.members.length > 0) {
      await User.updateMany(
        { _id: { $in: team.members } },
        { $pull: { memberOf: team._id } }
      );
    }

    // Remove team from club's teams array
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { teams: team._id } },
      { new: true }
    );

    team.linked = false;
    team.lastLinked = new Date();
    await team.save();

    res.status(200).json({ success: true, message: 'Team unlinked successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Add members to a team
// @route   PUT /api/teams/:teamId/members
// @access  Private (Club admin or coach)
router.put('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'memberIds must be a non-empty array' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if the requester is the club or one of the coaches
    const isOwner = team.club.toString() === req.user.userId;
    const isCoach = team.coaches.map(c => c.toString()).includes(req.user.userId);

    if (!isOwner && !isCoach) {
      return res.status(403).json({ success: false, message: 'Not authorized to add members to this team' });
    }

    // Add unique new members
    const existingIds = team.members.map(id => id.toString());
    const newUniqueMembers = memberIds.filter(id => !existingIds.includes(id));

    team.members.push(...newUniqueMembers);
    await team.save();

    // Update users: add teamId to their memberOf array
    await User.updateMany(
      { _id: { $in: newUniqueMembers }, memberOf: { $ne: teamId } },
      { $push: { memberOf: teamId } }
    );

    //send notifications for added members
    const usersToNotify = await User.find({ _id: { $in: newUniqueMembers } });
    for (const user of usersToNotify) {
      try {
        await sendNotification(
          user,
          '👥 Added as member',
          `You have been added to the team "${team.name}"`,
          { teamId }
        );
      } catch (err) {
        console.error(`Failed to send notification to user ${user._id}:`, err.message);
      }
    }

    const populatedTeam = await Team.findById(teamId)
      .populate('club', 'name image sport')
      .populate('coaches', '_id name image')
      .populate('members', '_id name image');

    res.status(200).json({ success: true, data: populatedTeam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Remove members from a team
// @route   PUT /api/teams/:teamId/remove-members
// @access  Private (Club admin or coach)
router.put('/:teamId/remove-members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'memberIds must be a non-empty array' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isOwner = team.club.toString() === req.user.userId;
    const isCoach = team.coaches.map(c => c.toString()).includes(req.user.userId);

    if (!isOwner && !isCoach) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove members from this team' });
    }

    // Remove members from team
    team.members = team.members.filter(id => !memberIds.includes(id.toString()));
    await team.save();

    // Remove this team from users' memberOf array
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { memberOf: teamId } }
    );

    res.status(200).json({ success: true, message: 'Members removed successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Add coaches to a team
// @route   PUT /api/teams/:teamId/coaches
// @access  Private (Club admin only)
router.put('/:teamId/coaches', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { coachIds } = req.body;

    if (!Array.isArray(coachIds) || coachIds.length === 0) {
      return res.status(400).json({ success: false, message: 'coachIds must be a non-empty array' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Only the club can add coaches
    if (team.club.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to add coaches' });
    }

    // Add unique new coaches
    const existingIds = team.coaches.map(id => id.toString());
    const newUniqueCoaches = coachIds.filter(id => !existingIds.includes(id));

    team.coaches.push(...newUniqueCoaches);
    await team.save();

    //send notifications for added members
    const usersToNotify = await User.find({ _id: { $in: newUniqueCoaches } });
    for (const user of usersToNotify) {
      try {
        await sendNotification(
          user,
          '📋 Added as coach',
          `You have been assigned to coach the team "${team.name}"`,
          { teamId }
        );
      } catch (err) {
        console.error(`Failed to send notification to user ${user._id}:`, err.message);
      }
    }

    const populatedTeam = await Team.findById(teamId)
      .populate('club', 'name image sport')
      .populate('coaches', '_id name image email')
      .populate('members', '_id name image');

    res.status(200).json({ success: true, data: populatedTeam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Remove coaches from a team
// @route   PUT /api/teams/:teamId/remove-coaches
// @access  Private (Club admin only)
router.put('/:teamId/remove-coaches', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { coachIds } = req.body;

    if (!Array.isArray(coachIds) || coachIds.length === 0) {
      return res.status(400).json({ success: false, message: 'coachIds must be a non-empty array' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Only the club can remove coaches
    if (team.club.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove coaches' });
    }

    // Remove coaches from team
    team.coaches = team.coaches.filter(id => !coachIds.includes(id.toString()));
    await team.save();

    res.status(200).json({ success: true, message: 'Coaches removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;