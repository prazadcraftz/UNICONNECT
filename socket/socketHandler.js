const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketHandler = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);
    
    // Add user to connected users map
    connectedUsers.set(socket.userId.toString(), {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date()
    });

    // Join user to their university room
    socket.join(`university:${socket.user.university}`);
    
    // Join user to global room
    socket.join('global');

    // Update user's online status
    User.findByIdAndUpdate(socket.userId, {
      lastSeen: new Date()
    }).catch(console.error);

    // Handle new question posted
    socket.on('new_question', (data) => {
      console.log('New question posted:', data.title);
      
      // Broadcast to university room
      socket.to(`university:${socket.user.university}`).emit('new_question', {
        ...data,
        author: socket.user.name,
        authorInitial: socket.user.initials,
        university: socket.user.university,
        timestamp: new Date()
      });

      // Broadcast to global room for trending questions
      socket.to('global').emit('question_trending', {
        questionId: data.id,
        title: data.title,
        university: socket.user.university
      });
    });

    // Handle new answer posted
    socket.on('new_answer', (data) => {
      console.log('New answer posted for question:', data.questionId);
      
      // Broadcast to all users viewing the question
      socket.to(`question:${data.questionId}`).emit('new_answer', {
        ...data,
        author: socket.user.name,
        authorInitial: socket.user.initials,
        timestamp: new Date()
      });
    });

    // Handle live chat messages (AMA sessions)
    socket.on('live_chat', (data) => {
      console.log('Live chat message:', data.message);
      
      // Broadcast to AMA session room
      socket.to(`ama:${data.sessionId}`).emit('live_chat', {
        message: data.message,
        author: socket.user.name,
        authorInitial: socket.user.initials,
        timestamp: new Date()
      });
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(`question:${data.questionId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`question:${data.questionId}`).emit('user_stopped_typing', {
        userId: socket.userId
      });
    });

    // Handle question likes
    socket.on('question_liked', (data) => {
      console.log('Question liked:', data.questionId);
      
      // Broadcast like update
      socket.to(`question:${data.questionId}`).emit('question_like_updated', {
        questionId: data.questionId,
        likedBy: socket.user.name,
        likeCount: data.likeCount
      });
    });

    // Handle new connections/matches
    socket.on('new_connection', (data) => {
      console.log('New connection made:', data.targetUserId);
      
      // Notify the target user
      const targetUser = connectedUsers.get(data.targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('connection_request', {
          from: socket.user.name,
          fromId: socket.userId,
          message: data.message
        });
      }
    });

    // Handle private messages
    socket.on('private_message', (data) => {
      const targetUser = connectedUsers.get(data.targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('private_message', {
          from: socket.user.name,
          fromId: socket.userId,
          message: data.message,
          timestamp: new Date()
        });
      }
    });

    // Handle joining specific rooms
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`User ${socket.user.name} joined room: ${roomName}`);
    });

    socket.on('leave_room', (roomName) => {
      socket.leave(roomName);
      console.log(`User ${socket.user.name} left room: ${roomName}`);
    });

    // Handle user status updates
    socket.on('status_update', (status) => {
      // Update user status in connected users map
      const userData = connectedUsers.get(socket.userId.toString());
      if (userData) {
        userData.status = status;
        connectedUsers.set(socket.userId.toString(), userData);
      }

      // Broadcast status to university room
      socket.to(`university:${socket.user.university}`).emit('user_status_changed', {
        userId: socket.userId,
        userName: socket.user.name,
        status: status
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
      
      // Remove user from connected users map
      connectedUsers.delete(socket.userId.toString());

      // Update user's last seen
      User.findByIdAndUpdate(socket.userId, {
        lastSeen: new Date()
      }).catch(console.error);

      // Notify other users in university room
      socket.to(`university:${socket.user.university}`).emit('user_offline', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Utility functions for external use
  const emitToUser = (userId, event, data) => {
    const userData = connectedUsers.get(userId.toString());
    if (userData) {
      io.to(userData.socketId).emit(event, data);
    }
  };

  const emitToUniversity = (university, event, data) => {
    io.to(`university:${university}`).emit(event, data);
  };

  const emitToAll = (event, data) => {
    io.emit(event, data);
  };

  const getConnectedUsers = () => {
    return Array.from(connectedUsers.values());
  };

  const getConnectedUsersCount = () => {
    return connectedUsers.size;
  };

  // Return utility functions
  return {
    emitToUser,
    emitToUniversity,
    emitToAll,
    getConnectedUsers,
    getConnectedUsersCount
  };
};

module.exports = socketHandler;
