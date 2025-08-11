const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorInitial: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: ''
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isAnswer: {
    type: Boolean,
    default: false
  },
  isAccepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  tag: {
    type: String,
    required: true,
    enum: ['Placements', 'Academics', 'Projects', 'Internships', 'Career', 'General']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorEmail: {
    type: String,
    required: true
  },
  authorInitial: {
    type: String,
    required: true
  },
  university: {
    type: String,
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [commentSchema],
  views: {
    type: Number,
    default: 0
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ author: 1 });
questionSchema.index({ university: 1 });
questionSchema.index({ tag: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ likes: 1 });
questionSchema.index({ 'comments.author': 1 });
questionSchema.index({ title: 'text', content: 'text' });

// Virtual for like count
questionSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
questionSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for answer count
questionSchema.virtual('answerCount').get(function() {
  return this.comments.filter(comment => comment.isAnswer).length;
});

// Method to add like
questionSchema.methods.addLike = function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove like
questionSchema.methods.removeLike = function(userId) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add comment
questionSchema.methods.addComment = function(commentData) {
  this.comments.push(commentData);
  return this.save();
};

// Method to increment views
questionSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to get questions with filters
questionSchema.statics.getQuestions = function(filters = {}, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  let query = this.find(filters)
    .populate('author', 'name profile.avatar')
    .populate('comments.author', 'name profile.avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  return query;
};

// Pre-save middleware to update user stats
questionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Increment questions asked count for the author
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.author, {
      $inc: { 'stats.questionsAsked': 1 }
    });
  }
  next();
});

module.exports = mongoose.model('Question', questionSchema);
