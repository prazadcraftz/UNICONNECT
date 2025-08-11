const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// In-memory storage
const users = [];
const questions = [
  {
    id: 1,
    title: "How to prepare for Google Internship 2024?",
    content: "I'm a 2nd year CS student looking for tips on preparing for Google's internship program. What should I focus on?",
    author: "Rahul Sharma",
    authorEmail: "rahul@example.com",
    tags: ["Career", "Internships"],
    likes: 12,
    answers: 3,
    createdAt: new Date().toISOString(),
    university: "Chandigarh University"
  },
  {
    id: 2,
    title: "Best Machine Learning Projects for Resume",
    content: "What are some good ML projects that can help strengthen my resume for data science roles?",
    author: "Priya Patel",
    authorEmail: "priya@example.com",
    tags: ["Academics", "Machine Learning"],
    likes: 8,
    answers: 2,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    university: "Delhi University"
  },
  {
    id: 3,
    title: "Healthcare Placements - What to Expect?",
    content: "I'm interested in healthcare placements. Can anyone share their experience with healthcare internships and what skills are most valued?",
    author: "Bhanu23",
    authorEmail: "bhanu23bai70391@gmail.com",
    tags: ["Placements", "Career"],
    likes: 5,
    answers: 1,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    university: "Test University"
  },
  {
    id: 4,
    title: "Resume Review Tips for Tech Internships",
    content: "Looking for feedback on my resume for software engineering internships. What sections should I prioritize?",
    author: "Amit Kumar",
    authorEmail: "amit@example.com",
    tags: ["Career", "Resume"],
    likes: 15,
    answers: 4,
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    university: "IIT Delhi"
  },
  {
    id: 5,
    title: "Campus Placement Preparation Strategy",
    content: "How should I prepare for campus placements? Looking for a comprehensive strategy covering technical and soft skills.",
    author: "Neha Singh",
    authorEmail: "neha@example.com",
    tags: ["Placements", "Career"],
    likes: 22,
    answers: 6,
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    university: "BITS Pilani"
  },
  {
    id: 6,
    title: "Data Science vs Software Engineering - Career Choice",
    content: "I'm confused between pursuing data science or software engineering. Can someone help me understand the career paths and opportunities?",
    author: "Vikram Patel",
    authorEmail: "vikram@example.com",
    tags: ["Career", "Academics"],
    likes: 18,
    answers: 5,
    createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    university: "NIT Trichy"
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running!' });
});

// Registration
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, university } = req.body;
  
  if (!name || !email || !password || !university) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const newUser = { id: Date.now(), name, email, password, university };
  users.push(newUser);
  
  res.json({ 
    message: 'Registration successful!', 
    user: { id: newUser.id, name, email, university },
    token: 'token_' + newUser.id
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    message: 'Login successful!', 
    user: { id: user.id, name: user.name, email: user.email, university: user.university },
    token: 'token_' + user.id
  });
});

// Questions
app.get('/api/questions', (req, res) => {
  res.json({ questions: questions, count: questions.length });
});

app.post('/api/questions', (req, res) => {
  const { title, content, tags, author, authorEmail, university } = req.body;
  
  if (!title || !content || !author || !authorEmail) {
    return res.status(400).json({ error: 'Title, content, author, and email are required' });
  }
  
  const newQuestion = {
    id: Date.now(),
    title,
    content,
    author,
    authorEmail,
    tags: tags || [],
    likes: 0,
    answers: 0,
    createdAt: new Date().toISOString(),
    university: university || 'Unknown University'
  };
  
  questions.push(newQuestion);
  
  res.json({ 
    message: 'Question created successfully!', 
    question: newQuestion 
  });
});

// Users
app.get('/api/users', (req, res) => {
  res.json({ users: users.map(u => ({ id: u.id, name: u.name, email: u.email, university: u.university })) });
});

// AI endpoints
app.post('/api/ai/generate-email', (req, res) => {
  res.json({ email: 'Mock AI email generated!' });
});

app.post('/api/ai/find-matches', (req, res) => {
  res.json({ matches: [] });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
  console.log(`✅ READY FOR REQUESTS`);
  console.log(`🔗 http://localhost:${PORT}`);
});
