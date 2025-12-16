/**
 * Dashboard Page JavaScript - CLEAN VERSION
 * Frontend ONLY renders data, NO business logic
 * 
 * ALL logic has been moved to backend:
 * - Date formatting → backend
 * - Status text localization → backend
 * - Progress color calculation → backend
 * - Overdue message calculation → backend
 * - Action permissions → backend
 * - Statistics formatting → backend
 * - Insights generation → backend
 * 
 * Frontend responsibilities:
 * ✅ Call API
 * ✅ Render HTML from data
 * ✅ Handle user events (click, submit)
 * ✅ Navigation
 * ✅ Show notifications
 * 
 * @author Clean Architecture Team
 * @version 2.0.0
 */

// Global state
let currentFilter = 'ALL';
let currentEditingTaskId = null;

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (!API.getToken()) {
        window.location.href = '/login.html';
        return;
    }

    await init();
    setupEventListeners();
});

/**
 * Initialize dashboard components
 */
async function init() {
    try {
        await loadUserInfo();
        await loadStatistics();
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
 * Setup all event listeners
 */
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('createTaskBtn').addEventListener('click', () => openTaskModal());
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    document.querySelector('.close-btn').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);

    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('taskModal')) {
            closeTaskModal();
        }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.target.dataset.status;
            handleFilterChange(status);
        });
    });
}

/**
 * Load user info
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
        throw error;
    }
}

/**
 * Load statistics - CALLS DISPLAY ENDPOINT
 * Backend returns FORMATTED data with INSIGHTS
 */
async function loadStatistics() {
    try {
        const response = await API.getStatisticsForDisplay();
        if (response.success && response.statistics) {
            const stats = response.statistics;

            // Backend already formatted everything - just render!
            document.getElementById('statTotal').textContent = stats.totalTasks;
            document.getElementById('statScheduled').textContent = stats.scheduledTasks;
            document.getElementById('statInProgress').textContent = stats.inProgressTasks;
            document.getElementById('statCompleted').textContent = stats.completedTasks;
            document.getElementById('statFailed').textContent = stats.failedTasks;
            document.getElementById('statCancelled').textContent = stats.cancelledTasks;

            // Render insights (NEW - from backend)
            renderInsights(stats.insights);
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

/**
 * Render insights from backend
 * Frontend ONLY renders, NO calculation
 */
function renderInsights(insights) {
    if (!insights || insights.length === 0) return;

    const insightsContainer = document.getElementById('insightsContainer');
    if (!insightsContainer) return;

    insightsContainer.innerHTML = '';

    insights.forEach(insight => {
        const insightDiv = document.createElement('div');
        insightDiv.className = `insight insight-${insight.type}`;
        insightDiv.innerHTML = `
            <span class="insight-icon">${insight.icon}</span>
            <span class="insight-message">${insight.message}</span>
        `;
        insightsContainer.appendChild(insightDiv);
    });
}

/**
 * Load tasks - CALLS DISPLAY ENDPOINT
 * Backend returns FULLY ENRICHED data with ALL display properties
 */
async function loadTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = '<div class="loading">Đang tải...</div>';

    try {
        // Call DISPLAY endpoint - backend returns enriched data
        const response = await API.getTaskListForDisplay(currentFilter);

        if (!response.success) {
            throw new Error(response.error || 'Failed to load tasks');
        }

        const tasks = response.tasks;

        if (tasks.length === 0) {
            // Backend provides context-aware empty message
            tasksList.innerHTML = `<div class="empty-state">${response.emptyMessage || 'Chưa có công việc nào'}</div>`;
            return;
        }

        // Render tasks - ALL data comes from backend!
        tasksList.innerHTML = tasks.map(task => createTaskCard(task)).join('');
        attachTaskActionListeners();

    } catch (error) {
        console.error('Failed to load tasks:', error);
        tasksList.innerHTML = '<div class="empty-state">Không thể tải công việc</div>';
    }
}

/**
 * Create HTML card for a task
 * Frontend ONLY renders - NO calculations!
 * ALL data (colors, formatting, permissions) comes from backend
 */
function createTaskCard(task) {
    // NO LOGIC HERE - just render what backend sends!
    // task.progressColor → from backend
    // task.statusText → from backend
    // task.statusClass → from backend
    // task.startDateFormatted → from backend
    // task.deadlineFormatted → from backend
    // task.overdueMessage → from backend
    // task.canEdit, canDelete, canComplete → from backend

    const quickCompleteBtn = task.canComplete ? 
        `<button class="quick-complete-btn" data-id="${task.id}" data-status="COMPLETED">✓ Hoàn thành</button>` : '';

    return `
        <div class="task-card" data-task-id="${task.id}">
            <div class="task-header">
                <h3 class="task-title">${task.icon} ${escapeHtml(task.title)}</h3>
                <div class="task-actions">
                    ${task.canEdit ? `<button class="btn btn-icon btn-secondary btn-edit" data-id="${task.id}" title="Sửa">✏️</button>` : ''}
                    ${task.canDelete ? `<button class="btn btn-icon btn-danger btn-delete" data-id="${task.id}" title="Xóa">🗑️</button>` : ''}
                </div>
            </div>
            
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            
            <div class="task-meta">
                <div class="meta-item">📅 Bắt đầu: ${task.startDateFormatted}</div>
                <div class="meta-item">⏰ Deadline: ${task.deadlineFormatted || 'Không có'}</div>
                ${task.overdueMessage ? `<div class="meta-item" style="color: var(--progress-danger); font-weight: 600;">⚠️ ${task.overdueMessage}</div>` : ''}
            </div>
            
            ${task.deadlineFormatted ? `
            <div class="task-progress">
                <div class="progress-label">
                    <span>Tiến độ thời gian</span>
                    <span>${Math.round(task.progress)}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${task.progressColor}" style="width: ${Math.min(task.progress, 100)}%"></div>
                </div>
            </div>
            ` : ''}
            
            <div class="task-footer">
                <span class="task-status-badge ${task.statusClass}">${task.statusText}</span>
                ${quickCompleteBtn}
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to task action buttons
 */
function attachTaskActionListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            handleEditTask(taskId);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            handleDeleteTask(taskId);
        });
    });

    document.querySelectorAll('.quick-complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            const newStatus = e.currentTarget.dataset.status;
            handleStatusChange(taskId, newStatus);
        });
    });
}

/**
 * Handle filter change
 */
function handleFilterChange(status) {
    currentFilter = status;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });

    // Reload tasks with filter
    loadTasks();
}

/**
 * Open task modal (create or edit)
 */
function openTaskModal(taskData = null) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const taskForm = document.getElementById('taskForm');

    if (taskData) {
        // Edit mode
        modalTitle.textContent = 'Chỉnh sửa công việc';
        currentEditingTaskId = taskData.id;
        
        document.getElementById('taskId').value = taskData.id;
        document.getElementById('taskTitle').value = taskData.title;
        document.getElementById('taskDescription').value = taskData.description || '';
        document.getElementById('taskStartDate').value = formatDateForInput(taskData.startDate);
        document.getElementById('taskDeadline').value = taskData.deadline ? formatDateForInput(taskData.deadline) : '';
    } else {
        // Create mode
        modalTitle.textContent = 'Tạo công việc mới';
        taskForm.reset();
        document.getElementById('taskId').value = '';
        currentEditingTaskId = null;
        
        // Auto-fill startDate with current datetime
        const now = new Date();
        const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        document.getElementById('taskStartDate').value = localDatetime;
    }

    modal.classList.add('active');
}

/**
 * Close task modal
 */
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentEditingTaskId = null;
}

/**
 * Handle task form submit
 */
async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const startDate = document.getElementById('taskStartDate').value;
    const deadline = document.getElementById('taskDeadline').value;

    if (!title) {
        showNotification('Vui lòng nhập tiêu đề công việc', 'error');
        return;
    }

    const taskData = {
        title,
        description,
        startDate: startDate || null,
        deadline: deadline || null
    };

    try {
        if (taskId) {
            // Update existing task
            await API.updateTask(taskId, taskData);
            showNotification('Cập nhật công việc thành công', 'success');
        } else {
            // Create new task
            await API.createTask(taskData);
            showNotification('Tạo công việc thành công', 'success');
        }

        closeTaskModal();
        await loadTasks();
        await loadStatistics();
    } catch (error) {
        showNotification('Có lỗi xảy ra: ' + error.message, 'error');
    }
}

/**
 * Handle edit task
 */
async function handleEditTask(taskId) {
    try {
        const response = await API.getTaskById(taskId);
        if (response.success && response.task) {
            openTaskModal(response.task);
        }
    } catch (error) {
        showNotification('Không thể tải thông tin công việc: ' + error.message, 'error');
    }
}

/**
 * Handle delete task
 */
async function handleDeleteTask(taskId) {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
        return;
    }

    try {
        await API.deleteTask(taskId);
        showNotification('Xóa công việc thành công', 'success');
        await loadTasks();
        await loadStatistics();
    } catch (error) {
        showNotification('Không thể xóa công việc: ' + error.message, 'error');
    }
}

/**
 * Handle status change
 */
async function handleStatusChange(taskId, newStatus) {
    try {
        await API.changeTaskStatus(taskId, newStatus);
        showNotification('Cập nhật trạng thái thành công', 'success');
        await loadTasks();
        await loadStatistics();
    } catch (error) {
        showNotification('Không thể thay đổi trạng thái: ' + error.message, 'error');
    }
}

/**
 * Handle logout
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show toast notification
 */
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Format Date object for HTML datetime-local input
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
