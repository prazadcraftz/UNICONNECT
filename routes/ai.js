const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// @route   POST /api/ai/generate-email
// @desc    Generate AI-powered email
// @access  Private
router.post('/generate-email', [
  auth,
  body('goal').trim().notEmpty(),
  body('contact').trim().notEmpty(),
  body('context').trim().notEmpty(),
  body('tone').optional().isIn(['formal', 'casual', 'professional', 'friendly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goal, contact, context, tone = 'professional' } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const prompt = `Generate a ${tone} email for a university student with the following details:

Goal: ${goal}
Contact: ${contact}
Context: ${context}
Student University: ${req.user.university}

The email should be:
- Professional yet approachable
- Specific to the goal mentioned
- Include relevant context
- End with a clear call to action
- Be between 150-300 words

Format the response as a complete email with subject line.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant helping university students write professional emails for networking, internships, and career opportunities."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const generatedEmail = completion.choices[0].message.content;

    res.json({
      email: generatedEmail,
      metadata: {
        goal,
        contact,
        tone,
        generatedAt: new Date(),
        model: "gpt-3.5-turbo"
      }
    });

  } catch (error) {
    console.error('Generate email error:', error);
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'AI service quota exceeded' });
    }
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

// @route   POST /api/ai/find-matches
// @desc    Find AI-powered user matches
// @access  Private
router.post('/find-matches', [
  auth,
  body('query').trim().notEmpty(),
  body('limit').optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { query, limit = 10 } = req.body;

    // First, try to find matches using database queries
    const dbMatches = await User.find({
      isActive: true,
      $or: [
        { 'profile.expertise': { $regex: query, $options: 'i' } },
        { 'profile.interests': { $regex: query, $options: 'i' } },
        { 'profile.bio': { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('-password -email')
    .limit(parseInt(limit))
    .sort({ 'stats.reputation': -1 });

    // If we have enough matches, return them
    if (dbMatches.length >= limit) {
      return res.json({
        matches: dbMatches,
        source: 'database',
        query
      });
    }

    // If not enough matches and OpenAI is available, enhance with AI
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiPrompt = `Given the search query "${query}" for finding university students with similar interests/expertise, suggest additional search terms or skills that might be related. Return only a JSON array of 5-10 relevant terms.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant helping to find relevant search terms for matching university students."
            },
            {
              role: "user",
              content: aiPrompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        });

        const aiSuggestions = JSON.parse(completion.choices[0].message.content);
        
        // Search with AI suggestions
        const aiMatches = await User.find({
          isActive: true,
          'profile.expertise': { $in: aiSuggestions },
          _id: { $ne: req.user._id }
        })
        .select('-password -email')
        .limit(parseInt(limit) - dbMatches.length)
        .sort({ 'stats.reputation': -1 });

        // Combine and deduplicate results
        const allMatches = [...dbMatches, ...aiMatches];
        const uniqueMatches = allMatches.filter((match, index, self) => 
          index === self.findIndex(m => m._id.toString() === match._id.toString())
        );

        res.json({
          matches: uniqueMatches.slice(0, limit),
          source: 'hybrid',
          query,
          aiSuggestions
        });

      } catch (aiError) {
        console.error('AI enhancement error:', aiError);
        // Fall back to database results only
        res.json({
          matches: dbMatches,
          source: 'database',
          query
        });
      }
    } else {
      res.json({
        matches: dbMatches,
        source: 'database',
        query
      });
    }

  } catch (error) {
    console.error('Find matches error:', error);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});

// @route   POST /api/ai/career-insights
// @desc    Get AI-powered career insights
// @access  Private
router.post('/career-insights', [
  auth,
  body('domain').trim().notEmpty(),
  body('company').optional().trim(),
  body('role').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { domain, company, role } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const prompt = `Provide career insights for a university student interested in ${domain}${company ? ` at ${company}` : ''}${role ? ` for the role of ${role}` : ''}.

Include:
1. Key skills and technologies to focus on
2. Recommended learning resources
3. Project ideas to build a portfolio
4. Networking strategies
5. Interview preparation tips
6. Timeline for career development

Make it specific, actionable, and relevant for a university student.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a career advisor specializing in helping university students prepare for tech careers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    const insights = completion.choices[0].message.content;

    res.json({
      insights,
      metadata: {
        domain,
        company,
        role,
        generatedAt: new Date(),
        model: "gpt-3.5-turbo"
      }
    });

  } catch (error) {
    console.error('Career insights error:', error);
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'AI service quota exceeded' });
    }
    res.status(500).json({ error: 'Failed to generate career insights' });
  }
});

// @route   POST /api/ai/analyze-profile
// @desc    Analyze user profile and provide suggestions
// @access  Private
router.post('/analyze-profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    const profileData = {
      name: user.name,
      university: user.university,
      bio: user.profile.bio,
      expertise: user.profile.expertise,
      interests: user.profile.interests,
      year: user.profile.year,
      branch: user.profile.branch,
      stats: user.stats
    };

    const prompt = `Analyze this university student's profile and provide suggestions for improvement:

Profile Data: ${JSON.stringify(profileData, null, 2)}

Provide analysis in the following areas:
1. Profile completeness (what's missing)
2. Skill development suggestions
3. Networking opportunities
4. Project recommendations
5. Career path guidance
6. Profile optimization tips

Be constructive and specific.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a career advisor analyzing university student profiles to provide improvement suggestions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.5
    });

    const analysis = completion.choices[0].message.content;

    res.json({
      analysis,
      profileData,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Profile analysis error:', error);
    if (error.code === 'insufficient_quota') {
      return res.status(503).json({ error: 'AI service quota exceeded' });
    }
    res.status(500).json({ error: 'Failed to analyze profile' });
  }
});

// @route   GET /api/ai/status
// @desc    Check AI service status
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    res.json({
      openai: {
        available: hasOpenAI,
        configured: hasOpenAI
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('AI status check error:', error);
    res.status(500).json({ error: 'Failed to check AI status' });
  }
});

module.exports = router;
