/**
 * Dashboard Page JavaScript
 * Manages task list, statistics, and CRUD operations
 * Follows Clean Architecture principles: UI -> API -> Backend
 */

// Global state management
let currentFilter = 'ALL';  // Current filter: ALL | PENDING | IN_PROGRESS | COMPLETED
let currentEditingTaskId = null;  // Task ID being edited in modal

/**
 * Initialize dashboard on page load
 * Flow: Check auth -> Load user info -> Load statistics -> Load tasks
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!API.getToken()) {
        window.location.href = '/login.html';
        return;
    }

    // Initialize page
    await init();

    // Setup event listeners
    setupEventListeners();
});

/**
 * Initialize dashboard components
 * Sequential loading: user info -> statistics -> tasks
 * @async
 * @throws {Error} When authentication fails (redirects to login)
 */
async function init() {
    try {
        // Load user info
        await loadUserInfo();

        // Load statistics
        await loadStatistics();

        // Load tasks
        await loadTasks();
    } catch (error) {
        console.error('Initialization error:', error);
        if (error.message.includes('token') || error.message.includes('auth')) {
            API.removeToken();
            window.location.href = '/login.html';
        }
    }
}

/**
 * Setup all event listeners for dashboard interactions
 * Handles: logout, create task, modal close, filter buttons
 * Best practice: Centralized event listener setup
 */
function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Create task button
    document.getElementById('createTaskBtn').addEventListener('click', () => openTaskModal());

    // Task form submit
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);

    // Modal close buttons
    document.querySelector('.close-btn').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);

    // Click outside modal to close
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('taskModal')) {
            closeTaskModal();
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.target.dataset.status;
            handleFilterChange(status);
        });
    });
}

/**
 * Load and display current user information
 * Uses JWT token from localStorage for authentication
 * @async
 * @throws {Error} When API call fails (logged, not thrown)
 * @see API.getCurrentUser()
 */
async function loadUserInfo() {
    try {
        const response = await API.getCurrentUser();
        if (response.success && response.user) {
            const userInfo = document.getElementById('userInfo');
            userInfo.textContent = `👤 ${response.user.username}`;
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

/**
 * Load and display task statistics
 * Shows: total tasks, pending, in progress, completed counts
 * @async
 * @throws {Error} When API call fails (logged, not thrown)
 * @see API.getStatistics()
 */
async function loadStatistics() {
    try {
        const response = await API.getStatistics();
        if (response.success && response.statistics) {
            const stats = response.statistics;
            // Map API response fields to UI elements
            document.getElementById('statTotal').textContent = stats.totalTasks || 0;
            document.getElementById('statPending').textContent = stats.pendingTasks || 0;
            document.getElementById('statInProgress').textContent = stats.inProgressTasks || 0;
            document.getElementById('statCompleted').textContent = stats.completedTasks || 0;
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

/**
 * Load and display task list with optional status filter
 * Shows loading spinner -> fetches tasks -> renders task cards
 * Includes fade-in animation for better UX
 * @async
 * @param {string|null} status - Task status filter (PENDING | IN_PROGRESS | COMPLETED) or null for all
 * @throws {Error} When API call fails (shows error state with retry button)
 * @see API.getTasks()
 * @see createTaskCard()
 * @example
 * await loadTasks('PENDING');  // Load only pending tasks
 * await loadTasks(null);       // Load all tasks
 */
async function loadTasks(status = null) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Đang tải công việc...</p>
        </div>
    `;

    try {
        const response = await API.getTasks(status);
        
        if (response.success && response.tasks) {
            if (response.tasks.length === 0) {
                const emptyMessages = {
                    'ALL': 'Chưa có công việc nào. Hãy tạo công việc đầu tiên!',
                    'PENDING': 'Không có công việc chờ xử lý',
                    'IN_PROGRESS': 'Không có công việc đang làm',
                    'COMPLETED': 'Chưa hoàn thành công việc nào'
                };
                const message = emptyMessages[currentFilter] || emptyMessages['ALL'];
                
                taskList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>${message}</p>
                        ${currentFilter === 'ALL' ? '<button class="btn btn-primary" onclick="document.getElementById(\'createTaskBtn\').click()">Tạo công việc ngay</button>' : ''}
                    </div>
                `;
                return;
            }

            taskList.innerHTML = response.tasks.map(task => createTaskCard(task)).join('');
            
            // Attach event listeners to task actions
            attachTaskActionListeners();
            
            // Add fade-in animation
            setTimeout(() => {
                document.querySelectorAll('.task-item').forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('fade-in');
                    }, index * 50);
                });
            }, 10);
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        taskList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Không thể tải danh sách công việc</p>
                <p class="error-details">${error.message}</p>
                <button class="btn btn-primary" onclick="loadTasks(${status ? '\''+status+'\'' : 'null'})">Thử lại</button>
            </div>
        `;
    }
}

/**
 * Create HTML card for a task with progress bar and actions
 * Progress bar color coding:
 * - Green (safe): 0-49%
 * - Yellow (warning): 50-79%
 * - Red (danger): 80-100%+
 * @param {Object} task - Task object from API
 * @param {string} task.id - Task UUID
 * @param {string} task.title - Task title
 * @param {string} task.description - Task description (optional)
 * @param {string} task.status - Task status (PENDING | IN_PROGRESS | COMPLETED)
 * @param {string} task.startDate - ISO 8601 date string
 * @param {string} task.deadline - ISO 8601 date string or null
 * @param {number} task.progress - Progress percentage (0-100+)
 * @param {boolean} task.isOverdue - Whether task is past deadline
 * @returns {string} HTML string for task card
 * @example
 * const html = createTaskCard({
 *   id: '123',
 *   title: 'Test Task',
 *   status: 'IN_PROGRESS',
 *   progress: 65.5,
 *   isOverdue: false
 * });
 */
function createTaskCard(task) {
    // Progress bar color based on percentage and status
    let progressClass = 'safe';
    let progressPercent = task.progress || 0;
    
    // If task is completed, use gray color and stop at 100%
    if (task.status === 'COMPLETED') {
        progressClass = 'completed';
        progressPercent = 100;
    } else if (progressPercent >= 80) {
        progressClass = 'danger';
    } else if (progressPercent >= 50) {
        progressClass = 'warning';
    }
    
    // Format dates
    const startDateStr = task.startDate ? Utils.formatDate(task.startDate) : 'N/A';
    const deadlineStr = task.deadline ? Utils.formatDate(task.deadline) : 'Không có';
    
    // Quick complete button
    const quickCompleteBtn = task.status !== 'COMPLETED' ? 
        `<button class="quick-complete-btn" data-id="${task.id}" data-status="COMPLETED">✓ Hoàn thành</button>` : '';

    return `
        <div class="task-card" data-task-id="${task.id}">
            <div class="task-header">
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                <div class="task-actions">
                    <button class="btn btn-icon btn-secondary btn-edit" data-id="${task.id}" title="Sửa">✏️</button>
                    <button class="btn btn-icon btn-danger btn-delete" data-id="${task.id}" title="Xóa">🗑️</button>
                </div>
            </div>
            
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            
            <div class="task-meta">
                <div class="meta-item">📅 Bắt đầu: ${startDateStr}</div>
                <div class="meta-item">⏰ Deadline: ${deadlineStr}</div>
                ${task.isOverdue ? '<div class="meta-item" style="color: var(--progress-danger); font-weight: 600;">⚠️ Quá hạn!</div>' : ''}
            </div>
            
            ${task.deadline ? `
            <div class="task-progress">
                <div class="progress-label">
                    <span>Tiến độ thời gian</span>
                    <span>${Math.round(progressPercent)}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${progressClass}" style="width: ${Math.min(progressPercent, 100)}%"></div>
                </div>
            </div>
            ` : ''}
            
            <div class="task-footer">
                <span class="task-status-badge ${task.status}">${Utils.getStatusText(task.status)}</span>
                ${quickCompleteBtn}
            </div>
        </div>
    `;
}
/**
 * Attach event listeners to task action buttons
 * Must be called after task cards are rendered
 * Handles: edit, delete, quick complete buttons
 * Best practice: Delegate events for dynamically created elements
 */function attachTaskActionListeners() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            handleEditTask(taskId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            handleDeleteTask(taskId);
        });
    });

    // Quick complete buttons
    document.querySelectorAll('.quick-complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            const newStatus = e.currentTarget.dataset.status;
            handleStatusChange(taskId, newStatus);
        });
    });
}

/**
 * Handle filter button click to filter tasks by status
 * Updates UI state and reloads task list
 * @param {string} status - Filter status (ALL | PENDING | IN_PROGRESS | COMPLETED)
 * @example
 * handleFilterChange('PENDING');  // Show only pending tasks
 */
function handleFilterChange(status) {
    currentFilter = status;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });

    // Load tasks with filter
    const filterStatus = status === 'ALL' ? null : status;
    loadTasks(filterStatus);
}

/**
 * Open task modal for create or edit mode
 * Edit mode: pre-fills form with task data
 * Create mode: sets default startDate to now
 * @param {Object|null} task - Task object for edit mode, null for create mode
 * @param {string} task.id - Task UUID
 * @param {string} task.title - Task title
 * @param {string} task.description - Task description
 * @param {string} task.startDate - ISO 8601 date
 * @param {string} task.deadline - ISO 8601 date
 * @example
 * openTaskModal();           // Create new task
 * openTaskModal(taskObj);    // Edit existing task
 */
function openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const taskForm = document.getElementById('taskForm');
    
    currentEditingTaskId = task ? task.id : null;

    if (task) {
        // Edit mode
        modalTitle.textContent = 'Chỉnh sửa công việc';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        
        // Set dates if available
        if (task.startDate) {
            document.getElementById('taskStartDate').value = formatDateForInput(task.startDate);
        }
        if (task.deadline) {
            document.getElementById('taskDeadline').value = formatDateForInput(task.deadline);
        }
    } else {
        // Create mode
        modalTitle.textContent = 'Tạo công việc mới';
        taskForm.reset();
        document.getElementById('taskId').value = '';
        
        // Do NOT set default start date - let user choose or leave empty
        // Backend will default to now if not provided
    }

    Utils.hideError('taskFormError');
    modal.classList.add('active');
}

/**
 * Close task modal and reset state
 * Clears currentEditingTaskId and removes active class
 */
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentEditingTaskId = null;
}

/**
 * Handle task form submission (create or update)
 * Validates input, calls API, updates UI on success
 * Validation rules:
 * - Title is required
 * - Deadline must be after startDate
 * @async
 * @param {Event} e - Form submit event
 * @throws {Error} When API call fails (shows error message)
 * @see API.createTask()
 * @see API.updateTask()
 */
async function handleTaskFormSubmit(e) {
    e.preventDefault();
    Utils.hideError('taskFormError');

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const startDate = document.getElementById('taskStartDate').value;
    const deadline = document.getElementById('taskDeadline').value;
    const taskId = document.getElementById('taskId').value;

    if (!title) {
        Utils.showError('taskFormError', 'Vui lòng nhập tiêu đề');
        return;
    }
    
    // Validate deadline is after startDate
    if (startDate && deadline && new Date(deadline) <= new Date(startDate)) {
        Utils.showError('taskFormError', 'Deadline phải sau ngày bắt đầu');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Đang lưu...';

    try {
        const taskData = {
            title,
            description,
            startDate: startDate || undefined,
            deadline: deadline || undefined
        };
        
        if (taskId) {
            // Update task
            await API.updateTask(taskId, taskData);
            showNotification('Đã cập nhật công việc thành công', 'success');
        } else {
            // Create new task
            await API.createTask(taskData);
            showNotification('Đã tạo công việc mới thành công', 'success');
        }

        closeTaskModal();
        await loadStatistics();
        await loadTasks(currentFilter === 'ALL' ? null : currentFilter);
    } catch (error) {
        Utils.showError('taskFormError', error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

/**
 * Handle edit task button click
 * Fetches task data from API and opens modal in edit mode
 * @async
 * @param {string} taskId - Task UUID to edit
 * @throws {Error} When API call fails (shows notification)
 * @see API.getTaskById()
 * @see openTaskModal()
 */
async function handleEditTask(taskId) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    // Show loading state
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskCard) {
        taskCard.style.opacity = '0.5';
        taskCard.style.pointerEvents = 'none';
    }
    
    try {
        const response = await API.getTaskById(taskId);
        if (response.success && response.task) {
            openTaskModal(response.task);
        }
    } catch (error) {
        showNotification('Không thể tải thông tin công việc: ' + error.message, 'error');
    } finally {
        // Remove loading state
        if (taskCard) {
            taskCard.style.opacity = '1';
            taskCard.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Handle delete task button click
 * Shows confirmation dialog before deletion
 * Updates statistics and reloads task list on success
 * @async
 * @param {string} taskId - Task UUID to delete
 * @throws {Error} When API call fails (shows notification)
 * @see API.deleteTask()
 */
async function handleDeleteTask(taskId) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
        return;
    }

    // Show loading state
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskCard) {
        taskCard.style.opacity = '0.5';
        taskCard.style.pointerEvents = 'none';
    }

    try {
        await API.deleteTask(taskId);
        showNotification('Đã xóa công việc thành công', 'success');
        await loadStatistics();
        await loadTasks(currentFilter === 'ALL' ? null : currentFilter);
    } catch (error) {
        showNotification('Không thể xóa công việc: ' + error.message, 'error');
        // Restore card if error
        if (taskCard) {
            taskCard.style.opacity = '1';
            taskCard.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Handle quick complete button click (change task status)
 * Updates task status and refreshes UI
 * @async
 * @param {string} taskId - Task UUID
 * @param {string} newStatus - New status (PENDING | IN_PROGRESS | COMPLETED)
 * @throws {Error} When API call fails (shows notification)
 * @see API.changeTaskStatus()
 */
async function handleStatusChange(taskId, newStatus) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    // Show loading state
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    const statusButton = taskCard?.querySelector('.status-btn');
    
    if (taskCard) {
        taskCard.style.opacity = '0.5';
    }
    if (statusButton) {
        statusButton.disabled = true;
        statusButton.textContent = 'Đang xử lý...';
    }
    
    try {
        await API.changeTaskStatus(taskId, newStatus);
        showNotification('Đã cập nhật trạng thái thành công', 'success');
        await loadStatistics();
        await loadTasks(currentFilter === 'ALL' ? null : currentFilter);
    } catch (error) {
        showNotification('Không thể thay đổi trạng thái: ' + error.message, 'error');
        // Restore button if error
        if (taskCard) {
            taskCard.style.opacity = '1';
        }
        if (statusButton) {
            statusButton.disabled = false;
            // Restore original text based on status
            const statusMap = {
                'PENDING': '⏸️ Tạm dừng',
                'IN_PROGRESS': '▶️ Bắt đầu',
                'COMPLETED': '✅ Hoàn thành'
            };
            statusButton.textContent = statusMap[newStatus] || 'Cập nhật';
        }
    }
}

/**
 * Handle logout button click
 * Shows confirmation, calls logout API, removes token, redirects to login
 * Best practice: Always remove token on logout (security)
 * @async
 * @see API.logout()
 * @see API.removeToken()
 */
async function handleLogout() {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        return;
    }

    try {
        await API.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        API.removeToken();
        window.location.href = '/login.html';
    }
}

/**
 * Escape HTML to prevent XSS attacks
 * Security best practice: Always escape user input before rendering
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe escaped text
 * @example
 * escapeHtml('<script>alert("XSS")</script>');
 * // Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification to user
 * Auto-dismisses after 3 seconds
 * Only one notification shown at a time (removes existing)
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success' | 'error' | 'warning')
 * @example
 * showNotification('Task created successfully', 'success');
 * showNotification('Failed to delete task', 'error');
 */
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.remove();
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Format Date object for HTML datetime-local input
 * Converts ISO 8601 date to 'YYYY-MM-DDTHH:mm' format
 * @param {Date|string} date - Date object or ISO 8601 string
 * @returns {string} Formatted date string for datetime-local input
 * @example
 * formatDateForInput(new Date('2025-01-15T14:30:00'));
 * // Returns: '2025-01-15T14:30'
 */
function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
