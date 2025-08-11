const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// In-memory storage for chat messages (in production, use database)
const chatMessages = new Map();
const amaSessions = new Map();

// @route   POST /api/chat/message
// @desc    Send a chat message
// @access  Private
router.post('/message', [
  auth,
  body('recipientId').notEmpty(),
  body('message').trim().notEmpty().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { recipientId, message } = req.body;

    const chatMessage = {
      id: Date.now().toString(),
      senderId: req.user._id,
      senderName: req.user.name,
      recipientId,
      message,
      timestamp: new Date(),
      read: false
    };

    // Store message (in production, save to database)
    const chatKey = [req.user._id, recipientId].sort().join('-');
    if (!chatMessages.has(chatKey)) {
      chatMessages.set(chatKey, []);
    }
    chatMessages.get(chatKey).push(chatMessage);

    res.json({
      message: 'Message sent successfully',
      chatMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// @route   GET /api/chat/messages/:userId
// @desc    Get chat messages with a specific user
// @access  Private
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chatKey = [req.user._id, userId].sort().join('-');
    const messages = chatMessages.get(chatKey) || [];

    // Paginate messages
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMessages = messages.slice(startIndex, endIndex);

    res.json({
      messages: paginatedMessages,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(messages.length / parseInt(limit)),
        hasNext: endIndex < messages.length,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// @route   POST /api/chat/ama/session
// @desc    Create an AMA session
// @access  Private
router.post('/ama/session', [
  auth,
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('scheduledFor').optional().isISO8601(),
  body('duration').optional().isInt({ min: 30, max: 180 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, scheduledFor, duration = 60 } = req.body;

    const amaSession = {
      id: Date.now().toString(),
      hostId: req.user._id,
      hostName: req.user.name,
      title,
      description,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      duration,
      status: 'scheduled', // scheduled, active, ended
      participants: [],
      messages: [],
      createdAt: new Date()
    };

    amaSessions.set(amaSession.id, amaSession);

    res.status(201).json({
      message: 'AMA session created successfully',
      amaSession
    });

  } catch (error) {
    console.error('Create AMA session error:', error);
    res.status(500).json({ error: 'Failed to create AMA session' });
  }
});

// @route   GET /api/chat/ama/sessions
// @desc    Get all AMA sessions
// @access  Public
router.get('/ama/sessions', async (req, res) => {
  try {
    const { status, hostId, page = 1, limit = 10 } = req.query;

    let sessions = Array.from(amaSessions.values());

    // Apply filters
    if (status) {
      sessions = sessions.filter(session => session.status === status);
    }
    if (hostId) {
      sessions = sessions.filter(session => session.hostId === hostId);
    }

    // Sort by scheduled time
    sessions.sort((a, b) => new Date(b.scheduledFor) - new Date(a.scheduledFor));

    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedSessions = sessions.slice(startIndex, endIndex);

    res.json({
      sessions: paginatedSessions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(sessions.length / parseInt(limit)),
        hasNext: endIndex < sessions.length,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get AMA sessions error:', error);
    res.status(500).json({ error: 'Failed to get AMA sessions' });
  }
});

// @route   GET /api/chat/ama/sessions/:sessionId
// @desc    Get specific AMA session
// @access  Public
router.get('/ama/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = amaSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'AMA session not found' });
    }

    res.json(session);

  } catch (error) {
    console.error('Get AMA session error:', error);
    res.status(500).json({ error: 'Failed to get AMA session' });
  }
});

// @route   POST /api/chat/ama/sessions/:sessionId/join
// @desc    Join an AMA session
// @access  Private
router.post('/ama/sessions/:sessionId/join', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = amaSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'AMA session not found' });
    }

    // Check if session is active
    if (session.status !== 'active' && session.status !== 'scheduled') {
      return res.status(400).json({ error: 'Session is not available for joining' });
    }

    // Add participant if not already joined
    const isAlreadyJoined = session.participants.some(p => p.userId === req.user._id);
    if (!isAlreadyJoined) {
      session.participants.push({
        userId: req.user._id,
        userName: req.user.name,
        joinedAt: new Date()
      });
    }

    res.json({
      message: 'Joined AMA session successfully',
      session
    });

  } catch (error) {
    console.error('Join AMA session error:', error);
    res.status(500).json({ error: 'Failed to join AMA session' });
  }
});

// @route   POST /api/chat/ama/sessions/:sessionId/message
// @desc    Send message in AMA session
// @access  Private
router.post('/ama/sessions/:sessionId/message', [
  auth,
  body('message').trim().notEmpty().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { message } = req.body;

    const session = amaSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'AMA session not found' });
    }

    // Check if session is active
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Check if user is a participant
    const isParticipant = session.participants.some(p => p.userId === req.user._id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Must join session before sending messages' });
    }

    const chatMessage = {
      id: Date.now().toString(),
      senderId: req.user._id,
      senderName: req.user.name,
      message,
      timestamp: new Date(),
      isHost: session.hostId === req.user._id
    };

    session.messages.push(chatMessage);

    res.json({
      message: 'Message sent successfully',
      chatMessage
    });

  } catch (error) {
    console.error('Send AMA message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// @route   PUT /api/chat/ama/sessions/:sessionId/status
// @desc    Update AMA session status
// @access  Private
router.put('/ama/sessions/:sessionId/status', [
  auth,
  body('status').isIn(['scheduled', 'active', 'ended'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { status } = req.body;

    const session = amaSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'AMA session not found' });
    }

    // Check if user is the host
    if (session.hostId !== req.user._id) {
      return res.status(403).json({ error: 'Only host can update session status' });
    }

    session.status = status;
    if (status === 'ended') {
      session.endedAt = new Date();
    }

    res.json({
      message: 'Session status updated successfully',
      session
    });

  } catch (error) {
    console.error('Update AMA session status error:', error);
    res.status(500).json({ error: 'Failed to update session status' });
  }
});

// @route   GET /api/chat/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = [];

    // Get all chat keys that include the current user
    for (const [chatKey, messages] of chatMessages.entries()) {
      const [user1Id, user2Id] = chatKey.split('-');
      
      if (user1Id === req.user._id || user2Id === req.user._id) {
        const otherUserId = user1Id === req.user._id ? user2Id : user1Id;
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
          conversations.push({
            chatKey,
            otherUserId,
            lastMessage: {
              content: lastMessage.message,
              timestamp: lastMessage.timestamp,
              senderId: lastMessage.senderId
            },
            unreadCount: messages.filter(m => 
              m.recipientId === req.user._id && !m.read
            ).length
          });
        }
      }
    }

    // Sort by last message timestamp
    conversations.sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));

    res.json(conversations);

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// @route   PUT /api/chat/messages/:userId/read
// @desc    Mark messages as read
// @access  Private
router.put('/messages/:userId/read', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const chatKey = [req.user._id, userId].sort().join('-');
    const messages = chatMessages.get(chatKey) || [];

    // Mark messages as read
    messages.forEach(message => {
      if (message.recipientId === req.user._id && !message.read) {
        message.read = true;
      }
    });

    res.json({
      message: 'Messages marked as read',
      unreadCount: 0
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

module.exports = router;
