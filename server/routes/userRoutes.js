const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const jwt = require("jsonwebtoken");

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

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    const match = await bcrypt.compare(password, user.password);

    if (!user || !match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, "123456");

    return res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with hashed password
    const newUser = await User.create({ ...rest, password: hashedPassword });

    const token = jwt.sign({ userId: newUser._id }, "123456");

    res.status(201).json({ newUser, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// find children by parent email
router.get('/find-children', async (req, res) => {
  try {
    const { parentEmail } = req.query;
    const children = await User.find(
      {
        type: 'Athlete',
        parentEmail
      }
    ).select('_id');

    res.json(children);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/check', async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ success: false, msg: 'Email or phone is required' });
  }

  try {
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(200).json({ success: false, msg: 'Email already exists'});
      }
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(200).json({ success: false, msg: 'Phone already exists' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Check failed:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

router.post('/checkpassword', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const match = await bcrypt.compare(req.body.password, user.password);


    if (!match) {
      return res.status(200).json({ success: false });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/updatePassword', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const password = req.body.password;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/resetPassword', async (req, res) => {
  try {
    const {email,password} = req.body;

    const user = await User.findOne({email});

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    user.password = hashedPassword

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/updateEmail', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is missing' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    //check if the new email is linked to another account
    const newEmailLinkedToOtherUser = await User.findOne({ email });
    if (newEmailLinkedToOtherUser && newEmailLinkedToOtherUser._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'This email is linked to another account' });
    }

    user.email = email
    user.verified.email = null;

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/updatePhone', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone is missing' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    //check if the new phone is linked to another account
    const newPhoneLinkedToOtherUser = await User.findOne({ phone });
    if (newPhoneLinkedToOtherUser && newPhoneLinkedToOtherUser._id.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'This phone number is linked to another account' });
    }

    user.phone = phone
    user.verified.phone = null;

    await user.save()

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/getUserId', async (req, res) => {
  const { email, } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: 'Email is required' });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(200).json({ success: true, id: existingUser._id });
    }

    return res.status(200).json({ success: false });
  } catch (err) {
    console.error('Check failed:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

router.post('/findAdmin', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, msg: 'Email is required' });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(404).json({ success: false, msg: 'Admin not found' });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id: existingUser._id,
        name: existingUser.name,
        image: existingUser.image
      }
    });

  } catch (err) {
    console.error('Check failed:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// @desc    Get all athletes in a club
// @route   GET /api/users/byclub/:clubId
// @access  Private (Club or admin)
router.get('/byClub/:clubId', async (req, res) => {
  const { clubId } = req.params;
  const { keyword } = req.query;

  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    return res.status(400).json({ success: false, message: 'Invalid club ID' });
  }

  try {
    // Find all teams that belong to the club
    const teams = await Team.find({ club: clubId }).select('_id');
    const teamIds = teams.map(team => team._id);

    // console.log('Found teams for club:', teamIds); // 👈 Log teams


    // Base condition for users linked to this club
    const baseConditions = {
      $or: [
        { memberOf: { $in: teamIds } },
        { clubs: clubId },
        { isStaff: clubId }
      ]
    };

    // If keyword exists, add keyword filter
    let finalQuery = baseConditions;

    if (keyword?.trim()) {
      const trimmedKeyword = keyword.trim();


      finalQuery = {
        $and: [
          baseConditions,
          {
            $or: [
              { name: { $regex: trimmedKeyword, $options: 'i' } },
              { email: { $regex: trimmedKeyword, $options: 'i' } }
            ]
          }
        ]
      };
    }

    // console.log('Final MongoDB query:', JSON.stringify(finalQuery, null, 2)); // 👈 Log full query

    const users = await User.find(finalQuery)
      .select('_id name email image memberOf clubs isStaff')
      .populate('memberOf', 'name');

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error('Error fetching club users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users
router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Search users by name (case-insensitive, partial match)
router.get('/search', async (req, res) => {
  const { keyword, type, role } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  try {
    const regex = new RegExp(keyword, 'i');

    const query = {
      $or: [
        { name: { $regex: regex } },
        { email: { $regex: regex } }
      ]
    };

    if (type) {
      query.type = type;
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password -__v -createdAt -updatedAt');


    res.json(users);
  } catch (err) {
    console.error('Error searching athletes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/users/clubs
// @desc    Get all users with type "Club"
// @access  Public or Protected (based on your app logic)
router.get('/clubs', async (req, res) => {
  const { sport } = req.query;
  const filter = { type: 'Club' };

  if (sport) {
    filter.sport = sport;
  }

  try {
    const clubs = await User.find(filter).select('name image');
    res.status(200).json({ success: true, data: clubs });
  } catch (err) {
    console.error('Error fetching clubs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/clubs/byAssociation/:userId
router.get('/clubs/byAssociation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate({
      path: 'clubs',
      select: '_id name image',
      match: { type: 'Club' }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: user.clubs || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/association/:userId/add-club
router.put('/association/:userId/add-club', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { coachIds } = req.body;

    if (!Array.isArray(coachIds) || coachIds.length === 0) {
      return res.status(400).json({ success: false, message: 'coachIds must be a non-empty array' });
    }

    const user = await User.findById(userId);
    if (!user || user.type !== 'Association') {
      return res.status(404).json({ success: false, message: 'Association not found' });
    }

    // Prevent duplicates
    const uniqueIds = coachIds.filter(id => !user.clubs.includes(id));
    user.clubs.push(...uniqueIds);

    await user.save();
    const populatedUser = await User.findById(userId).populate('clubs');

    res.json({ success: true, data: populatedUser.clubs });
  } catch (err) {
    console.error('Add club error:', err);
    res.status(500).json({ success: false, message: 'Server error while adding club' });
  }
});

// PUT /api/users/association/:userId/remove-clubs
router.put('/association/:userId/remove-clubs', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { clubsIds } = req.body;

    if (!Array.isArray(clubsIds) || clubsIds.length === 0) {
      return res.status(400).json({ success: false, message: 'clubsIds must be a non-empty array' });
    }

    const user = await User.findById(userId);
    if (!user || user.type !== 'Association') {
      return res.status(404).json({ success: false, message: 'Association not found' });
    }

    user.clubs = user.clubs.filter(id => !clubsIds.includes(id.toString()));

    await user.save();
    const populatedUser = await User.findById(userId).populate('clubs');

    res.json({ success: true, data: populatedUser.clubs });
  } catch (err) {
    console.error('Remove club error:', err);
    res.status(500).json({ success: false, message: 'Server error while removing club' });
  }
});

//Edit user
router.put('/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  // Optional: Ensure the token's userId matches the request param
  if (req.user.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized access to update user data' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: req.body }, // Update only fields provided in req.body
      { new: true, runValidators: true }
    ).select('-password'); // Don't return the password

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get user info
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  console.log('getting user info for userId = ', userId)

  try {
    const user = await User.findById(userId)
      .select('-password')
      .populate('isStaff')
      .populate('memberOf')
      .populate('clubs')
      .populate('children');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // console.log(user)

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ✅ Store Expo push token
router.post('/push-token', authenticateToken, async (req, res) => {
  const { userId, expoPushToken } = req.body;

  console.log('Registering Push Notification Token for ', userId, expoPushToken)

  if (req.user.userId !== userId) {
    console.log('Unauthorized')
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { expoPushToken },
      { new: true }
    );

    console.log('Found user= ', user._id)


    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, token: user.expoPushToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
