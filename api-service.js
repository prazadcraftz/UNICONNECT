// API Service for UniConnect+ Frontend
class APIService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.socket = null;
        this.initSocket();
    }

    // Initialize Socket.io connection
    initSocket() {
        try {
            this.socket = io('http://localhost:3000', {
                auth: {
                    token: this.token
                },
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('Connected to backend via Socket.io');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from backend');
            });

            this.socket.on('question_created', (data) => {
                console.log('New question created:', data);
                // Trigger UI update
                if (window.questionManager) {
                    window.questionManager.loadQuestions();
                }
            });

            this.socket.on('new_message', (data) => {
                console.log('New message received:', data);
                // Handle new chat messages
            });

        } catch (error) {
            console.error('Socket.io connection failed:', error);
        }
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
        if (this.socket) {
            this.socket.auth = { token };
        }
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
        if (this.socket) {
            this.socket.auth = { token: null };
        }
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check if the backend is running.');
            }
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        this.clearToken();
        // Optionally call logout endpoint if needed
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.log('Logout endpoint not available, continuing with local logout');
        }
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // User management methods
    async getUsers() {
        return this.request('/users');
    }

    async getUserById(userId) {
        return this.request(`/users/${userId}`);
    }

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async searchUsers(query) {
        return this.request(`/users/search?q=${encodeURIComponent(query)}`);
    }

    async sendConnectionRequest(targetUserId) {
        return this.request('/users/connect', {
            method: 'POST',
            body: JSON.stringify({ targetUserId })
        });
    }

    // Questions and Answers methods
    async getQuestions() {
        return this.request('/questions');
    }

    async createQuestion(questionData) {
        const response = await this.request('/questions', {
            method: 'POST',
            body: JSON.stringify(questionData)
        });

        // Emit socket event for real-time updates
        if (this.socket) {
            this.socket.emit('new_question', questionData);
        }

        return response;
    }

    async likeQuestion(questionId) {
        return this.request(`/questions/${questionId}/like`, {
            method: 'POST'
        });
    }

    async addComment(questionId, commentData) {
        return this.request(`/questions/${questionId}/comments`, {
            method: 'POST',
            body: JSON.stringify(commentData)
        });
    }

    async deleteQuestion(questionId) {
        return this.request(`/questions/${questionId}`, {
            method: 'DELETE'
        });
    }

    // Chat methods
    async sendMessage(recipientId, message) {
        return this.request('/chat/message', {
            method: 'POST',
            body: JSON.stringify({ recipientId, message })
        });
    }

    async getMessages(userId) {
        return this.request(`/chat/messages/${userId}`);
    }

    async createAMASession(sessionData) {
        return this.request('/chat/ama/session', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    }

    async getAMASessions() {
        return this.request('/chat/ama/sessions');
    }

    // AI methods
    async generateEmail(emailData) {
        return this.request('/ai/generate-email', {
            method: 'POST',
            body: JSON.stringify(emailData)
        });
    }

    async findMatches(query) {
        return this.request('/ai/find-matches', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    async getCareerInsights(domain) {
        return this.request('/ai/career-insights', {
            method: 'POST',
            body: JSON.stringify({ domain })
        });
    }

    async analyzeProfile() {
        return this.request('/ai/analyze-profile', {
            method: 'POST'
        });
    }

    // Socket.io methods for real-time communication
    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
        }
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    getToken() {
        return this.token;
    }
}

// Create global API service instance
window.apiService = new APIService();
