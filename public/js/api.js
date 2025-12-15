/**
 * API Service - Centralized API calls
 * Frontend JavaScript
 */

const API_BASE_URL = '/api';

class API {
    /**
     * Get auth token from localStorage
     */
    static getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Set auth token to localStorage
     */
    static setToken(token) {
        localStorage.setItem('token', token);
    }

    /**
     * Remove auth token
     */
    static removeToken() {
        localStorage.removeItem('token');
    }

    /**
     * Get authorization headers
     */
    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Make HTTP request
     */
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * Authentication APIs
     */
    static async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    static async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async getCurrentUser() {
        return this.request('/auth/me', {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    static async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Task APIs
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

    static async getTasks(status = null) {
        const queryString = status ? `?status=${status}` : '';
        return this.request(`/tasks${queryString}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    static async getTaskById(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    static async updateTask(taskId, taskData) {
        // taskData can be an object {title, description, startDate, deadline} or just title/description for backward compatibility
        const data = typeof taskData === 'object' && !Array.isArray(taskData) ? taskData : { title: arguments[1], description: arguments[2] };
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });
    }

    static async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
    }

    static async changeTaskStatus(taskId, status) {
        return this.request(`/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ status })
        });
    }

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
