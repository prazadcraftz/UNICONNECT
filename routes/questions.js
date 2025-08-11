const express = require('express');
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/questions
// @desc    Get all questions with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      tag, 
      university, 
      author, 
      search,
      sort = 'newest' 
    } = req.query;

    // Build filters
    const filters = {};
    if (tag) filters.tag = tag;
    if (university) filters.university = university;
    if (author) filters.author = author;
    if (search) {
      filters.$text = { $search: search };
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'mostLiked':
        sortOptions = { 'likes': -1 };
        break;
      case 'mostViewed':
        sortOptions = { views: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const questions = await Question.find(filters)
      .populate('author', 'name profile.avatar')
      .populate('comments.author', 'name profile.avatar')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Question.countDocuments(filters);

    res.json({
      questions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/questions/:id
// @desc    Get question by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'name profile.avatar')
      .populate('comments.author', 'name profile.avatar');

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Increment views
    await question.incrementViews();

    res.json(question);
  } catch (error) {
    console.error('Get question error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 10, max: 200 }),
  body('content').trim().isLength({ min: 20, max: 5000 }),
  body('tag').isIn(['Placements', 'Academics', 'Projects', 'Internships', 'Career', 'General'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, tag, isAnonymous = false } = req.body;

    const question = new Question({
      title,
      content,
      tag,
      author: req.user._id,
      authorName: req.user.name,
      authorEmail: req.user.email,
      authorInitial: req.user.initials,
      university: req.user.university,
      isAnonymous
    });

    await question.save();

    // Populate author info for response
    await question.populate('author', 'name profile.avatar');

    res.status(201).json(question);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 10, max: 200 }),
  body('content').optional().trim().isLength({ min: 20, max: 5000 }),
  body('tag').optional().isIn(['Placements', 'Academics', 'Projects', 'Internships', 'Career', 'General'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user is the author
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    const { title, content, tag } = req.body;
    if (title) question.title = title;
    if (content) question.content = content;
    if (tag) question.tag = tag;

    await question.save();
    await question.populate('author', 'name profile.avatar');

    res.json(question);
  } catch (error) {
    console.error('Update question error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user is the author
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    await question.remove();
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/questions/:id/like
// @desc    Like/unlike a question
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isLiked = question.likes.includes(req.user._id);
    
    if (isLiked) {
      await question.removeLike(req.user._id);
    } else {
      await question.addLike(req.user._id);
    }

    await question.populate('author', 'name profile.avatar');
    res.json(question);
  } catch (error) {
    console.error('Like question error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/questions/:id/comments
// @desc    Add a comment to a question
// @access  Private
router.post('/:id/comments', [
  auth,
  body('content').trim().isLength({ min: 1, max: 1000 }),
  body('isAnswer').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { content, isAnswer = false } = req.body;

    const comment = {
      content,
      author: req.user._id,
      authorName: req.user.name,
      authorInitial: req.user.initials,
      isAnswer
    };

    await question.addComment(comment);
    await question.populate('author', 'name profile.avatar');
    await question.populate('comments.author', 'name profile.avatar');

    res.json(question);
  } catch (error) {
    console.error('Add comment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/questions/user/:userId
// @desc    Get questions by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const questions = await Question.find({ author: req.params.userId })
      .populate('author', 'name profile.avatar')
      .populate('comments.author', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Question.countDocuments({ author: req.params.userId });

    res.json({
      questions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get user questions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/questions/tags/stats
// @desc    Get question statistics by tags
// @access  Public
router.get('/tags/stats', async (req, res) => {
  try {
    const stats = await Question.aggregate([
      {
        $group: {
          _id: '$tag',
          count: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          totalViews: { $sum: '$views' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Get tag stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
