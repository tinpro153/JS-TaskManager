/**
 * API Service - Centralized API calls
 * Frontend JavaScript
 */

const API_BASE_URL = '/api';

class API {
    /**
     * Get auth token from localStorage
     * @returns {string|null} JWT token or null if not found
     */
    static getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Set auth token to localStorage
     * @param {string} token - JWT authentication token
     */
    static setToken(token) {
        localStorage.setItem('token', token);
    }

    /**
     * Remove auth token from localStorage (logout)
     */
    static removeToken() {
        localStorage.removeItem('token');
    }

    /**
     * Get authorization headers for authenticated requests
     * @returns {Object} Headers object with Authorization header if token exists
     * @example
     * // Returns { 'Authorization': 'Bearer eyJhbGci...' }
     */
    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Make HTTP request to API endpoint with automatic retry logic
     * @param {string} endpoint - API endpoint path (e.g., '/tasks', '/auth/login')
     * @param {Object} options - Fetch options (method, body, headers)
     * @param {number} retries - Maximum number of retries for network errors (default: 3)
     * @returns {Promise<Object>} API response data
     * @throws {Error} When request fails or response is not ok
     * @example
     * const data = await API.request('/tasks', { method: 'GET', headers: API.getAuthHeaders() });
     */
    static async request(endpoint, options = {}, retries = 3) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                const data = await response.json();

                if (!response.ok) {
                    // Don't retry client errors (4xx) - these are business logic errors
                    if (response.status >= 400 && response.status < 500) {
                        throw new Error(data.error || 'Request failed');
                    }
                    
                    // Retry server errors (5xx)
                    throw new Error(data.error || `Server error: ${response.status}`);
                }

                return data;
            } catch (error) {
                lastError = error;
                
                // Don't retry if it's not a network error or if we've exhausted retries
                if (attempt === retries || error.message.includes('Request failed')) {
                    console.error('API Error:', error);
                    throw error;
                }
                
                // Calculate exponential backoff delay: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`API request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // This should never be reached, but just in case
        throw lastError;
    }

    /**
     * Authentication APIs
     */
    
    /**
     * Register a new user account
     * @param {string} username - Username (3-50 chars, alphanumeric + underscore)
     * @param {string} email - Email address (valid email format)
     * @param {string} password - Password (min 6 chars)
     * @returns {Promise<Object>} Response with success flag and user data
     * @throws {Error} When validation fails or username/email exists
     * @example
     * const response = await API.register('johndoe', 'john@example.com', 'password123');
     * // { success: true, user: { id, username, email }, message: 'Registration successful' }
     */
    static async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    /**
     * Login to the system
     * @param {string} email - Email address or username
     * @param {string} password - User password
     * @returns {Promise<Object>} Response with token and user data
     * @throws {Error} When credentials are invalid
     * @example
     * const response = await API.login('john@example.com', 'password123');
     * // { success: true, token: 'eyJhbGci...', user: { id, username, email } }
     */
    static async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    /**
     * Get current authenticated user information
     * @returns {Promise<Object>} Current user data
     * @throws {Error} When token is invalid or expired
     * @example
     * const response = await API.getCurrentUser();
     * // { success: true, user: { id, username, email } }
     */
    static async getCurrentUser() {
        return this.request('/auth/me', {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Logout from the system
     * @returns {Promise<Object>} Logout confirmation
     * @example
     * const response = await API.logout();
     * // { success: true, message: 'Logout successful' }
     */
    static async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Task APIs
     */
    
    /**
     * Create a new task
     * @param {Object|string} taskData - Task data object or title string (for backward compatibility)
     * @param {string} taskData.title - Task title (required, max 200 chars)
     * @param {string} [taskData.description] - Task description (optional, max 1000 chars)
     * @param {string} [taskData.startDate] - Start date ISO string (optional, default: now)
     * @param {string} [taskData.deadline] - Deadline ISO string (optional, must be after startDate)
     * @returns {Promise<Object>} Response with created task including progress and isOverdue
     * @throws {Error} When validation fails or deadline < startDate
     * @example
     * const response = await API.createTask({
     *   title: 'Hoàn thành báo cáo',
     *   description: 'Báo cáo tháng 12',
     *   startDate: '2025-01-01T09:00:00Z',
     *   deadline: '2025-01-31T18:00:00Z'
     * });
     * // { success: true, task: { id, title, ..., progress: 0, isOverdue: false } }
     */
    static async createTask(taskData) {
        // taskData can be an object {title, description, startDate, deadline} or just title/description for backward compatibility
        const data = typeof taskData === 'object' && !Array.isArray(taskData) ? taskData : { title: arguments[0], description: arguments[1] };
        return this.request('/tasks', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
    }

    /**
     * Get all tasks for current user
     * @param {string|null} [status=null] - Filter by status (PENDING, IN_PROGRESS, COMPLETED)
     * @returns {Promise<Object>} Response with tasks array containing progress/isOverdue
     * @example
     * const response = await API.getTasks('PENDING');
     * // { success: true, tasks: [{id, title, progress: 25.5, isOverdue: false, ...}], count: 3 }
     */
    static async getTasks(status = null) {
        const queryString = status ? `?status=${status}` : '';
        return this.request(`/tasks${queryString}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Get task details by ID
     * @param {string} taskId - Task UUID
     * @returns {Promise<Object>} Response with task data including progress/isOverdue
     * @throws {Error} When task not found or unauthorized
     * @example
     * const response = await API.getTaskById('507f1f77bcf86cd799439012');
     * // { success: true, task: { id, title, progress: 65.5, isOverdue: false, ... } }
     */
    static async getTaskById(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Update task information
     * @param {string} taskId - Task UUID
     * @param {Object|string} taskData - Task data object or title string (for backward compatibility)
     * @param {string} [taskData.title] - New task title (optional, max 200 chars)
     * @param {string} [taskData.description] - New description (optional, max 1000 chars)
     * @param {string} [taskData.startDate] - New start date ISO string (optional)
     * @param {string} [taskData.deadline] - New deadline ISO string (optional, must be after startDate)
     * @returns {Promise<Object>} Response with updated task including recalculated progress
     * @throws {Error} When task not found, unauthorized, or validation fails
     * @example
     * const response = await API.updateTask('507f...', {
     *   title: 'Updated title',
     *   deadline: '2025-02-15T18:00:00Z'
     * });
     * // { success: true, task: { id, ..., progress: 15.3, isOverdue: false } }
     */
    static async updateTask(taskId, taskData) {
        // taskData can be an object {title, description, startDate, deadline} or just title/description for backward compatibility
        const data = typeof taskData === 'object' && !Array.isArray(taskData) ? taskData : { title: arguments[1], description: arguments[2] };
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
    }

    /**
     * Delete a task
     * @param {string} taskId - Task UUID
     * @returns {Promise<Object>} Deletion confirmation
     * @throws {Error} When task not found or unauthorized
     * @example
     * const response = await API.deleteTask('507f1f77bcf86cd799439012');
     * // { success: true, message: 'Task deleted successfully' }
     */
    static async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Change task status
     * @param {string} taskId - Task UUID
     * @param {string} status - New status (PENDING, IN_PROGRESS, COMPLETED)
     * @returns {Promise<Object>} Response with updated task including progress/isOverdue
     * @throws {Error} When business rule violated (e.g., COMPLETED → PENDING)
     * @example
     * const response = await API.changeTaskStatus('507f...', 'COMPLETED');
     * // { success: true, task: { id, status: 'COMPLETED', progress: 100, isOverdue: false } }
     */
    static async changeTaskStatus(taskId, status) {
        return this.request(`/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ status })
        });
    }

    /**
     * Get task statistics for current user
     * @returns {Promise<Object>} Response with task counts and completion rate
     * @example
     * const response = await API.getStatistics();
     * // { success: true, totalTasks: 10, pendingTasks: 3, inProgressTasks: 2, 
     * //   completedTasks: 5, completionRate: 50 }
     */
    static async getStatistics() {
        return this.request('/tasks/statistics', {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }
}

/**
 * Utility functions
 */
const Utils = {
    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },

    hideError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    },

    showSuccess(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getStatusText(status) {
        const statusMap = {
            'PENDING': 'Chờ xử lý',
            'IN_PROGRESS': 'Đang làm',
            'COMPLETED': 'Hoàn thành'
        };
        return statusMap[status] || status;
    }
};
