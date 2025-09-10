const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");

const Post = require('../models/Post');
const User = require('../models/User');
const Team = require('../models/Team');
const Schedule = require('../models/Schedule');

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

// GET /api/search?keyword=someText
router.get('/', authenticateToken, async (req, res) => {
  const {keyword = '',category,userType,sport,gender,eventType,role,limit = 20,} = req.query;

  const regex = new RegExp(keyword, 'i');
  const parsedLimit = Math.min(parseInt(limit), 50);
  const results = {};

  try {
    const tasks = [];

    // Users
    if (category==='All' || category === 'Users') {
      const userFilter = {
        $and: [
          {
            $or: [
              { name: { $regex: regex } },
              { email: { $regex: regex } },
              { phone: { $regex: regex } },
              // { 'contactInfo.facebook': { $regex: regex } },
              // { 'contactInfo.instagram': { $regex: regex } },
            ],
          },
        ],
      };

      if (userType!=='All') userFilter.$and.push({ type: userType });
      if (sport!=='All') userFilter.$and.push({ sport: { $in: [sport] } });
      if (gender!=='All') userFilter.$and.push({ gender });
      if (role) userFilter.$and.push({ role });

      tasks.push(
        User.find(userFilter)
          .select('_id name email sport gender type image role')
          .limit(parsedLimit)
          .then((data) => (results.users = data))
      );
    }

    // Teams
    if (category==='All' || category === 'Teams') {
      
    }

    // Events
    if (category==='All' || category === 'Events') {
      const scheduleFilter = {
        $or: [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
          { venue: { $regex: regex } },
          { opponent: { $regex: regex } },
          { competition: { $regex: regex } },
          { notes: { $regex: regex } },
        ],
      };

      if (eventType) scheduleFilter.eventType = eventType;

      tasks.push(
        Schedule.find(scheduleFilter)
          .select('title description eventType startDateTime endDateTime venue createdBy')
          .limit(parsedLimit)
          .then((data) => (results.events = data))
      );
    }

    // Posts
    if (category==='All' || category === 'Posts') {
      const postFilter = {
        $or: [
          { content: { $regex: regex } },
          { 'media.images': { $regex: regex } },
        ],
      };

      tasks.push(
        Post.find(postFilter)
          .populate('created_by', 'name image type')
          .select('type content media date created_by')
          .limit(parsedLimit)
          .then((data) => (results.posts = data))
      );
    }

    await Promise.all(tasks);

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
