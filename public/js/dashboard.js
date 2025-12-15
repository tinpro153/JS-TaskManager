/**
 * Dashboard Page JavaScript
 */

let currentFilter = 'ALL';
let currentEditingTaskId = null;

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

async function loadStatistics() {
    try {
        const response = await API.getStatistics();
        if (response.success && response.statistics) {
            const stats = response.statistics;
            document.getElementById('statTotal').textContent = stats.total || 0;
            document.getElementById('statPending').textContent = stats.pending || 0;
            document.getElementById('statInProgress').textContent = stats.inProgress || 0;
            document.getElementById('statCompleted').textContent = stats.completed || 0;
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

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

function createTaskCard(task) {
    // Progress bar color based on percentage
    let progressClass = 'safe';
    let progressPercent = task.progress || 0;
    
    if (progressPercent >= 80) {
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
        <div class="task-card">
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

function attachTaskActionListeners() {
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
        
        // Set default start date to now
        document.getElementById('taskStartDate').value = formatDateForInput(new Date());
    }

    Utils.hideError('taskFormError');
    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentEditingTaskId = null;
}

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

async function handleEditTask(taskId) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    try {
        const response = await API.getTaskById(taskId);
        if (response.success && response.task) {
            openTaskModal(response.task);
        }
    } catch (error) {
        showNotification('Không thể tải thông tin công việc: ' + error.message, 'error');
    }
}

async function handleDeleteTask(taskId) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
        return;
    }

    try {
        await API.deleteTask(taskId);
        showNotification('Đã xóa công việc thành công', 'success');
        await loadStatistics();
        await loadTasks(currentFilter === 'ALL' ? null : currentFilter);
    } catch (error) {
        showNotification('Không thể xóa công việc: ' + error.message, 'error');
    }
}

async function handleStatusChange(taskId, newStatus) {
    if (!taskId) {
        showNotification('Không tìm thấy thông tin công việc', 'error');
        return;
    }
    
    try {
        await API.changeTaskStatus(taskId, newStatus);
        showNotification('Đã cập nhật trạng thái thành công', 'success');
        await loadStatistics();
        await loadTasks(currentFilter === 'ALL' ? null : currentFilter);
    } catch (error) {
        showNotification('Không thể thay đổi trạng thái: ' + error.message, 'error');
    }
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// Helper function to format date for datetime-local input
function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
