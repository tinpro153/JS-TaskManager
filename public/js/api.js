const API_BASE_URL = '/api';

class API {

    static getToken() {
        return localStorage.getItem('token');
    }

    static setToken(token) {
        localStorage.setItem('token', token);
    }

    static removeToken() {
        localStorage.removeItem('token');
    }

    static getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

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

    static async getTaskForDisplay(taskId) {
        return this.request(`/tasks/${taskId}/display`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    static async getTaskListForDisplay(statusFilter = null) {
        let endpoint = '/tasks/display';
        if (statusFilter && statusFilter !== 'ALL') {
            endpoint += `?status=${statusFilter}`;
        }
        return this.request(endpoint, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }

    static async getStatisticsForDisplay() {
        return this.request('/tasks/statistics/display', {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
    }
}

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
