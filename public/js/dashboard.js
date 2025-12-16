let currentFilter = 'ALL';
let currentEditingTaskId = null;
let allTasks = [];
let viewMode = 'card'; // 'card' or 'table'

document.addEventListener('DOMContentLoaded', async () => {
    if (!API.getToken()) {
        window.location.href = '/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    
    if (statusParam) {
        currentFilter = statusParam;
        viewMode = 'table';
    } else {
        currentFilter = 'ALL';
        viewMode = 'card';
    }

    await init();
    setupEventListeners();
});

async function init() {
    try {
        const sidebarIdentifier = viewMode === 'card' ? 'dashboard' : currentFilter;
        await window.Sidebar.load('#sidebarContainer', sidebarIdentifier);
        
        setupViewMode();
        
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

function setupViewMode() {
    const pageHeader = document.querySelector('.page-header');
    const pageActionsBar = document.querySelector('.page-actions-bar');
    const insightsContainer = document.getElementById('insightsContainer');
    const filtersSection = document.querySelector('.filters-section');
    const tasksList = document.getElementById('tasksList');
    const tableContainer = document.querySelector('.table-container');
    
    if (viewMode === 'card') {
        if (pageHeader) pageHeader.style.display = 'none';
        if (pageActionsBar) pageActionsBar.style.display = 'flex';
        if (insightsContainer) insightsContainer.style.display = 'grid';
        if (filtersSection) filtersSection.style.display = 'none';
        if (tasksList) tasksList.style.display = 'grid';
        if (tableContainer) tableContainer.style.display = 'none';
    } else {
        if (pageHeader) pageHeader.style.display = 'flex';
        if (pageActionsBar) pageActionsBar.style.display = 'none';
        if (insightsContainer) insightsContainer.style.display = 'none';
        if (filtersSection) filtersSection.style.display = 'flex';
        if (tasksList) tasksList.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        
        const statusNames = {
            'ALL': 'Tổng công việc',
            'SCHEDULED': 'Đang chờ',
            'IN_PROGRESS': 'Đang làm',
            'COMPLETED': 'Hoàn thành',
            'FAILED': 'Không hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        const pageTitle = document.getElementById('pageTitle');
        const pageSubtitle = document.getElementById('pageSubtitle');
        if (pageTitle) pageTitle.textContent = statusNames[currentFilter] || 'QUẢN LÝ CÔNG VIỆC';
        if (pageSubtitle) pageSubtitle.textContent = `Hiển thị: ${statusNames[currentFilter] || 'Tất cả'}`;
    }
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    const createTaskBtn = document.getElementById('createTaskBtn');
    const createTaskBtnTable = document.getElementById('createTaskBtnTable');
    
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', () => openTaskModal());
    }
    if (createTaskBtnTable) {
        createTaskBtnTable.addEventListener('click', () => openTaskModal());
    }
    
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    document.querySelector('.close-btn').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);

    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('taskModal')) {
            closeTaskModal();
        }
    });

    if (viewMode === 'table') {
        const filterTitle = document.getElementById('filterTitle');
        const sortOrder = document.getElementById('sortOrder');
        
        if (filterTitle) {
            filterTitle.addEventListener('input', () => filterTasksLocally());
        }
        
        if (sortOrder) {
            sortOrder.addEventListener('change', () => filterTasksLocally());
        }
    }
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
        throw error;
    }
}

async function loadStatistics() {
    try {
        const response = await API.getStatisticsForDisplay();
        if (response.success && response.statistics) {
            const stats = response.statistics;

            window.Sidebar.updateBadges(stats);

            renderInsights(stats.insights);
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

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

async function loadTasks() {
    try {
        const response = await API.getTaskListForDisplay(currentFilter);

        if (!response.success) {
            throw new Error(response.error || 'Failed to load tasks');
        }

        const tasks = response.tasks;
        allTasks = tasks;

        if (viewMode === 'card') {
            renderTasksAsCards(tasks, response.emptyMessage);
        } else {
            renderTasksAsTable(tasks, response.emptyMessage);
        }

    } catch (error) {
        console.error('Failed to load tasks:', error);
        if (viewMode === 'card') {
            const tasksList = document.getElementById('tasksList');
            if (tasksList) {
                tasksList.innerHTML = '<div class="empty-state">Không thể tải công việc</div>';
            }
        } else {
            const tableBody = document.getElementById('taskTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Không thể tải công việc</td></tr>';
            }
        }
    }
}

function renderTasksAsCards(tasks, emptyMessage) {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    if (tasks.length === 0) {
        tasksList.innerHTML = `<div class="empty-state">${emptyMessage || 'Chưa có công việc nào'}</div>`;
        return;
    }

    tasksList.innerHTML = tasks.map(task => createTaskCard(task)).join('');
    attachTaskActionListeners();
}

function createTaskCard(task) {
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

function renderTasksAsTable(tasks, emptyMessage) {
    const tableBody = document.getElementById('taskTableBody');
    if (!tableBody) return;

    if (tasks.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-cell">${emptyMessage || 'Chưa có công việc nào'}</td></tr>`;
        return;
    }

    tableBody.innerHTML = tasks.map(task => createTaskRow(task)).join('');
    attachTaskActionListeners();
}

function createTaskRow(task) {
    const descriptionShort = task.description ? 
        (task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description) : 
        '<em>Không có mô tả</em>';
    
    return `
        <tr data-task-id="${task.id}">
            <td class="td-title">
                <strong>${task.icon} ${escapeHtml(task.title)}</strong>
                ${task.overdueMessage ? `<div class="overdue-indicator">⚠️ ${task.overdueMessage}</div>` : ''}
            </td>
            <td class="td-description">${descriptionShort}</td>
            <td class="td-date">${task.startDateFormatted}</td>
            <td class="td-date">${task.deadlineFormatted || '<em>Không có</em>'}</td>
            <td class="td-status">
                <span class="task-status-badge ${task.statusClass}">${task.statusText}</span>
            </td>
            <td class="td-date">${task.createdAtFormatted || formatDate(task.createdAt)}</td>
            <td class="td-actions">
                ${task.canComplete ? `<button class="btn-table btn-complete" data-id="${task.id}" data-status="COMPLETED" title="Hoàn thành">Hoàn thành</button>` : ''}
                ${task.canEdit ? `<button class="btn-table btn-edit" data-id="${task.id}" title="Sửa">Sửa</button>` : ''}
                ${task.canDelete ? `<button class="btn-table btn-delete" data-id="${task.id}" title="Xóa">Xóa</button>` : ''}
            </td>
        </tr>
    `;
}

function filterTasksLocally() {
    if (viewMode !== 'table') return;

    const filterTitle = document.getElementById('filterTitle');
    const sortOrder = document.getElementById('sortOrder');
    
    if (!filterTitle || !sortOrder) return;

    const searchText = filterTitle.value.toLowerCase();
    const sortValue = sortOrder.value;
    
    let filteredTasks = [...allTasks];
    
    if (searchText) {
        filteredTasks = filteredTasks.filter(task => 
            task.title.toLowerCase().includes(searchText) ||
            (task.description && task.description.toLowerCase().includes(searchText))
        );
    }
    
    filteredTasks.sort((a, b) => {
        if (sortValue === 'newest') {
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortValue === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        } else if (sortValue === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        return 0;
    });
    
    renderTasksAsTable(filteredTasks);
}

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

    document.querySelectorAll('.quick-complete-btn, .btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            const newStatus = e.currentTarget.dataset.status;
            handleStatusChange(taskId, newStatus);
        });
    });
}

function formatDate(dateString) {
    if (!dateString) return 'Không có';
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openTaskModal(taskData = null) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const taskForm = document.getElementById('taskForm');

    if (taskData) {
        modalTitle.textContent = 'Chỉnh sửa công việc';
        currentEditingTaskId = taskData.id;
        
        document.getElementById('taskId').value = taskData.id;
        document.getElementById('taskTitle').value = taskData.title;
        document.getElementById('taskDescription').value = taskData.description || '';
        document.getElementById('taskStartDate').value = formatDateForInput(taskData.startDate);
        document.getElementById('taskDeadline').value = taskData.deadline ? formatDateForInput(taskData.deadline) : '';
    } else {
        modalTitle.textContent = 'Tạo công việc mới';
        taskForm.reset();
        document.getElementById('taskId').value = '';
        currentEditingTaskId = null;
        
        const now = new Date();
        const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        document.getElementById('taskStartDate').value = localDatetime;
    }

    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentEditingTaskId = null;
}

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
            await API.updateTask(taskId, taskData);
            showNotification('Cập nhật công việc thành công', 'success');
        } else {
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

function formatDateForInput(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
