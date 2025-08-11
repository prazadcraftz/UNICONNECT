# 🎓 UniConnect+ - University Networking Platform

A modern, full-stack web application designed to connect university students, alumni, and professionals for networking, mentorship, and career development.

## ✨ Features

### 🔐 Authentication & User Management
- User registration and login system
- Profile management with university affiliation
- Secure authentication with JWT tokens

### 💬 Questions & Answers Forum
- Post and answer questions by category (Career, Academics, Internships, Placements)
- Real-time question feed with filtering options
- Like and comment functionality
- Trending topics and top contributors

### 🤖 AI-Powered Features
- **AI Email Generator**: Generate professional networking emails
- **Smart Connect**: AI-powered mentor matching
- **Career Insights**: Personalized career recommendations

### 👥 Smart Connect & Networking
- Find mentors and mentees based on interests and expertise
- Professional networking with alumni and industry professionals
- Career timeline visualization

### 🎯 AMA Sessions & Mentorship
- Ask-Me-Anything sessions with industry experts
- Structured mentorship programs
- Live chat functionality

## 🛠️ Technology Stack

### Frontend
- **HTML5, CSS3, JavaScript (ES6+)**
- **Tailwind CSS** - Modern, utility-first CSS framework
- **Font Awesome** - Icon library
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing

### Development Tools
- **Live Server** - Development server
- **Nodemon** - Auto-restart for development

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/UniConnect-Plus.git
   cd UniConnect-Plus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the backend server**
   ```bash
   node start-server.js
   ```
   The server will start on `http://localhost:3000`

4. **Open the frontend**
   - Open `main.html` in your browser
   - Or use Live Server extension in VS Code
   - The app will be available at `http://localhost:5500/main.html`

## 📁 Project Structure

```
UniConnect-Plus/
├── main.html              # Main frontend application
├── api-service.js         # API service layer
├── start-server.js        # Backend server (in-memory)
├── server.js              # Full backend with MongoDB
├── package.json           # Node.js dependencies
├── .env.example           # Environment variables template
├── README.md              # Project documentation
└── .gitignore            # Git ignore rules
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/uniconnect
JWT_SECRET=your-secret-key
```

### Database Setup (Optional)
For full functionality with MongoDB:
1. Install MongoDB
2. Update the connection string in `.env`
3. Use `server.js` instead of `start-server.js`

## 🎯 Usage Guide

### For Students
1. **Register/Login** with your university email
2. **Browse Questions** in the Q&A forum
3. **Post Questions** about career, academics, or internships
4. **Connect with Mentors** through Smart Connect
5. **Generate Professional Emails** using AI tools

### For Professionals/Alumni
1. **Create Profile** with your expertise areas
2. **Answer Questions** to help students
3. **Offer Mentorship** through the platform
4. **Network** with other professionals

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/logout` - User logout

### Questions
- `GET /api/questions` - Get all questions
- `POST /api/questions` - Create new question
- `PUT /api/questions/:id/like` - Like a question

### AI Features
- `POST /api/ai/generate-email` - Generate networking email
- `POST /api/ai/find-matches` - Find mentor matches

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user profile

## 🧪 Testing

### Backend Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password","university":"Test University"}'
```

### Frontend Testing
1. Open browser developer tools
2. Check console for any errors
3. Test all features: login, posting questions, AI features

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch" Error**
   - Ensure backend server is running on port 3000
   - Check CORS settings
   - Verify API endpoints

2. **Questions Not Loading**
   - Check browser console for errors
   - Verify API service connection
   - Ensure backend has sample data

3. **Authentication Issues**
   - Clear browser cache and localStorage
   - Check JWT token validity
   - Verify user credentials

### Debug Mode
The application includes debug information (can be removed for production):
- User email and authentication status
- Questions count and data statistics
- API connection status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tailwind CSS** for the beautiful UI framework
- **Font Awesome** for the icon library
- **Socket.io** for real-time features
- **Express.js** for the robust backend framework

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@uniconnect-plus.com
- Documentation: [Wiki](https://github.com/yourusername/UniConnect-Plus/wiki)

---

**Made with ❤️ for the university community**
