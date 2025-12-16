
const TaskDisplayDTO = require('../dto/TaskDisplayDTO');
const TaskDisplayData = require('../../domain/valueobjects/TaskDisplayData');

class GetTaskListForDisplayUseCase {

    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    async execute(userId, statusFilter = null) {
        //Validate status filter
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'];
        if (statusFilter && !validStatuses.includes(statusFilter)) {
            const error = new Error(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}`);
            error.statusCode = 400;
            error.errorCode = 'INVALID_STATUS_FILTER';
            throw error;
        }

        //Fetch tasks from repository (with filter)
        let rawTasks;
        if (statusFilter === 'IN_PROGRESS') {
            //Gộp PENDING vào IN_PROGRESS (đang làm)
            const inProgressTasks = await this.taskRepository.findByUserIdAndStatus(userId, 'IN_PROGRESS');
            const pendingTasks = await this.taskRepository.findByUserIdAndStatus(userId, 'PENDING');
            rawTasks = [...inProgressTasks, ...pendingTasks];
        } else if (statusFilter) {
            //Specific status filter
            rawTasks = await this.taskRepository.findByUserIdAndStatus(userId, statusFilter);
        } else {
            //No filter (ALL) - exclude CANCELLED tasks
            const allTasks = await this.taskRepository.findByUserId(userId);
            rawTasks = allTasks.filter(task => task.getStatus() !== 'CANCELLED');
        }

        //Auto-update task statuses
        for (const task of rawTasks) {
            //Auto-transition SCHEDULED to PENDING when startDate reached
            if (task.shouldTransitionToPending()) {
                task.updateStatus('PENDING');
                await this.taskRepository.update(task);
            }
            
            //Auto-mark tasks as FAILED if deadline passed
            if (task.shouldBeMarkedAsFailed()) {
                task.markAsFailed();
                await this.taskRepository.update(task);
            }
        }

        //Enrich each task with display data
        const enrichedTasks = rawTasks.map(task => this._enrichTask(task));

        //Generate context-aware empty message
        const emptyMessage = this._generateEmptyMessage(statusFilter, enrichedTasks.length);

        //Generate filter metadata
        const filterMetadata = this._generateFilterMetadata(statusFilter);

        return {
            tasks: enrichedTasks,
            count: enrichedTasks.length,
            filter: filterMetadata,
            emptyMessage: enrichedTasks.length === 0 ? emptyMessage : null
        };
    }

    _enrichTask(task) {
        const status = task.getStatus();
        const startDate = task.getStartDate();
        const deadline = task.getDeadline();
        const progress = task.getProgressPercentage();
        const isOverdue = task.isOverdue();

        const startDateFormatted = this._formatDate(startDate);
        const deadlineFormatted = deadline ? this._formatDate(deadline) : null;
        const createdAtFormatted = this._formatDate(task.getCreatedAt());

        const overdueMessage = isOverdue ? this._calculateOverdueMessage(deadline) : null;

        let displayData;
        switch (status) {
            case 'SCHEDULED':
                displayData = TaskDisplayData.forScheduled(startDateFormatted, deadlineFormatted);
                break;

            case 'PENDING':
                displayData = TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);
                break;

            case 'IN_PROGRESS':
                displayData = TaskDisplayData.forInProgress(
                    startDateFormatted,
                    deadlineFormatted,
                    progress || 0,
                    overdueMessage
                );
                break;

            case 'COMPLETED':
                displayData = TaskDisplayData.forCompleted(startDateFormatted, deadlineFormatted);
                break;

            case 'FAILED':
                displayData = TaskDisplayData.forFailed(startDateFormatted, deadlineFormatted, overdueMessage);
                break;

            case 'CANCELLED':
                displayData = TaskDisplayData.forCancelled(startDateFormatted, deadlineFormatted);
                break;

            default:
                displayData = TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);
        }

        return new TaskDisplayDTO({
            id: task.getId(),
            title: task.getTitle(),
            description: task.getDescription() || '',
            status: task.getStatus(),
            userId: task.getUserId(),
            createdAt: task.getCreatedAt(),
            updatedAt: task.getUpdatedAt(),
            startDate: task.getStartDate(),
            deadline: task.getDeadline(),
            progress: progress || 0,
            isOverdue: isOverdue,
            displayData,
            createdAtFormatted
        });
    }

    _generateEmptyMessage(statusFilter, taskCount) {
        if (taskCount > 0) return null;

        switch (statusFilter) {
            case 'SCHEDULED':
                return 'Chưa có công việc đang chờ nào';
            case 'IN_PROGRESS':
                return 'Chưa có công việc đang làm nào';
            case 'COMPLETED':
                return 'Chưa có công việc hoàn thành nào';
            case 'FAILED':
                return 'Chưa có công việc không hoàn thành nào';
            case 'CANCELLED':
                return 'Chưa có công việc đã hủy nào';
            default:
                return 'Chưa có công việc nào. Hãy tạo công việc đầu tiên!';
        }
    }

    _generateFilterMetadata(statusFilter) {
        const filterMap = {
            'SCHEDULED': { applied: 'SCHEDULED', displayText: 'Đang chờ' },
            'IN_PROGRESS': { applied: 'IN_PROGRESS', displayText: 'Đang làm' },
            'COMPLETED': { applied: 'COMPLETED', displayText: 'Hoàn thành' },
            'FAILED': { applied: 'FAILED', displayText: 'Không hoàn thành' },
            'CANCELLED': { applied: 'CANCELLED', displayText: 'Đã hủy' },
            null: { applied: 'ALL', displayText: 'Tất cả' }
        };

        return filterMap[statusFilter] || filterMap[null];
    }

    _formatDate(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';

        // Use toLocaleString with Asia/Ho_Chi_Minh timezone for consistent formatting
        // This ensures dates display correctly regardless of server timezone (UTC in Docker)
        try {
            const options = {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            
            const formatted = d.toLocaleString('en-GB', options);
            // Format: "DD/MM/YYYY, HH:MM" -> "DD/MM/YYYY HH:MM"
            return formatted.replace(',', '');
        } catch (error) {
            // Fallback to UTC if timezone not supported
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            const hours = String(d.getUTCHours()).padStart(2, '0');
            const minutes = String(d.getUTCMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    }

    _calculateOverdueMessage(deadline) {
        if (!deadline) return null;

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = now - deadlineDate;

        if (diffMs <= 0) return null;

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            return `Quá hạn ${diffDays} ngày`;
        } else if (diffHours > 0) {
            return `Quá hạn ${diffHours} giờ`;
        } else {
            return `Quá hạn ${diffMinutes} phút`;
        }
    }
}

module.exports = GetTaskListForDisplayUseCase;
