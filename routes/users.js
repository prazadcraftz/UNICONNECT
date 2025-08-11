const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      university, 
      expertise, 
      search,
      sort = 'reputation' 
    } = req.query;

    // Build filters
    const filters = { isActive: true };
    if (university) filters.university = university;
    if (expertise) {
      filters['profile.expertise'] = { $in: [expertise] };
    }
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'profile.bio': { $regex: search, $options: 'i' } },
        { 'profile.expertise': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'reputation':
        sortOptions = { 'stats.reputation': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      default:
        sortOptions = { 'stats.reputation': -1 };
    }

    const users = await User.find(filters)
      .select('-password -email')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filters);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }),
  body('profile.bio').optional().isLength({ max: 500 }),
  body('profile.year').optional().isInt({ min: 1, max: 6 }),
  body('profile.branch').optional().trim(),
  body('profile.expertise').optional().isArray(),
  body('profile.interests').optional().isArray(),
  body('profile.linkedin').optional().isURL(),
  body('profile.github').optional().isURL(),
  body('profile.portfolio').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update basic info
    if (req.body.name) user.name = req.body.name;

    // Update profile
    if (req.body.profile) {
      Object.assign(user.profile, req.body.profile);
    }

    await user.save();

    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, university, expertise, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const filters = { isActive: true };
    if (university) filters.university = university;
    if (expertise) {
      filters['profile.expertise'] = { $in: [expertise] };
    }

    const users = await User.find({
      ...filters,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { 'profile.bio': { $regex: q, $options: 'i' } },
        { 'profile.expertise': { $regex: q, $options: 'i' } },
        { university: { $regex: q, $options: 'i' } }
      ]
    })
    .select('-password -email')
    .limit(parseInt(limit))
    .sort({ 'stats.reputation': -1 });

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/users/connect
// @desc    Send connection request
// @access  Private
router.post('/connect', [
  auth,
  body('targetUserId').notEmpty(),
  body('message').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { targetUserId, message } = req.body;

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Check if not connecting to self
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    // TODO: Implement connection logic
    // For now, just return success
    res.json({ 
      message: 'Connection request sent successfully',
      targetUser: targetUser.getPublicProfile()
    });

  } catch (error) {
    console.error('Send connection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Get user statistics overview
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalQuestions: { $sum: '$stats.questionsAsked' },
          totalAnswers: { $sum: '$stats.answersGiven' },
          totalConnections: { $sum: '$stats.connectionsMade' },
          avgReputation: { $avg: '$stats.reputation' }
        }
      }
    ]);

    res.json(stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      totalQuestions: 0,
      totalAnswers: 0,
      totalConnections: 0,
      avgReputation: 0
    });
  } catch (error) {
    console.error('Get stats overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/users/university/:university
// @desc    Get users by university
// @access  Public
router.get('/university/:university', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const users = await User.find({ 
      university: req.params.university,
      isActive: true 
    })
    .select('-password -email')
    .sort({ 'stats.reputation': -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments({ 
      university: req.params.university,
      isActive: true 
    });

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get university users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
