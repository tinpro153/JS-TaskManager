/**
 * Get Task List For Display Use Case
 * Business Layer - Fetches task list with full display enrichment
 * 
 * This use case:
 * 1. Fetches filtered tasks from repository
 * 2. Enriches EACH task with display data
 * 3. Generates context-aware empty message
 * 4. Returns array of TaskDisplayDTO
 * 
 * Frontend receives fully-enriched data, zero calculations needed.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

const TaskDisplayDTO = require('../dto/TaskDisplayDTO');
const TaskDisplayData = require('../../domain/valueobjects/TaskDisplayData');

class GetTaskListForDisplayUseCase {
    /**
     * @param {Object} taskRepository - Task repository port (interface)
     */
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute use case
     * @param {string} userId - Current user ID (from JWT)
     * @param {string|null} statusFilter - Optional status filter (SCHEDULED | IN_PROGRESS | COMPLETED | FAILED | CANCELLED)
     * @returns {Promise<Object>} Object with tasks array, count, and context
     * @returns {Promise<Object>} { tasks: TaskDisplayDTO[], count: number, filter: {}, emptyMessage: string }
     */
    async execute(userId, statusFilter = null) {
        // Step 1: Validate status filter
        const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'];
        if (statusFilter && !validStatuses.includes(statusFilter)) {
            const error = new Error(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}`);
            error.statusCode = 400;
            error.errorCode = 'INVALID_STATUS_FILTER';
            throw error;
        }

        // Step 2: Fetch tasks from repository (with filter)
        let rawTasks;
        if (statusFilter === 'IN_PROGRESS') {
            // Gộp PENDING vào IN_PROGRESS (đang làm)
            const inProgressTasks = await this.taskRepository.findByUserIdAndStatus(userId, 'IN_PROGRESS');
            const pendingTasks = await this.taskRepository.findByUserIdAndStatus(userId, 'PENDING');
            rawTasks = [...inProgressTasks, ...pendingTasks];
        } else if (statusFilter) {
            // Specific status filter
            rawTasks = await this.taskRepository.findByUserIdAndStatus(userId, statusFilter);
        } else {
            // No filter (ALL) - exclude CANCELLED tasks
            const allTasks = await this.taskRepository.findByUserId(userId);
            rawTasks = allTasks.filter(task => task.getStatus() !== 'CANCELLED');
        }

        // Step 2.5: Auto-update task statuses (business logic)
        for (const task of rawTasks) {
            // Auto-transition SCHEDULED to PENDING when startDate reached
            if (task.shouldTransitionToPending()) {
                task.updateStatus('PENDING');
                await this.taskRepository.update(task);
            }
            
            // Auto-mark tasks as FAILED if deadline passed
            if (task.shouldBeMarkedAsFailed()) {
                task.markAsFailed();
                await this.taskRepository.update(task);
            }
        }

        // Step 3: Enrich each task with display data
        const enrichedTasks = rawTasks.map(task => this._enrichTask(task));

        // Step 4: Generate context-aware empty message
        const emptyMessage = this._generateEmptyMessage(statusFilter, enrichedTasks.length);

        // Step 5: Generate filter metadata
        const filterMetadata = this._generateFilterMetadata(statusFilter);

        return {
            tasks: enrichedTasks,
            count: enrichedTasks.length,
            filter: filterMetadata,
            emptyMessage: enrichedTasks.length === 0 ? emptyMessage : null
        };
    }

    /**
     * Enrich a single task with full display data
     * @private
     * @param {Task} task - Task entity from domain
     * @returns {TaskDisplayDTO} Enriched task DTO
     */
    _enrichTask(task) {
        // Use getters from Task entity
        const status = task.getStatus();
        const startDate = task.getStartDate();
        const deadline = task.getDeadline();
        const progress = task.getProgressPercentage();
        const isOverdue = task.isOverdue();

        // Format dates
        const startDateFormatted = this._formatDate(startDate);
        const deadlineFormatted = deadline ? this._formatDate(deadline) : null;

        // Calculate overdue message
        const overdueMessage = isOverdue ? this._calculateOverdueMessage(deadline) : null;

        // Create display data based on status
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

        // Build DTO using entity getters
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
            displayData
        });
    }

    /**
     * Generate context-aware empty message
     * Backend logic - different message based on filter
     * @private
     * @param {string|null} statusFilter - Applied filter
     * @param {number} taskCount - Number of tasks
     * @returns {string} Empty message
     */
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

    /**
     * Generate filter metadata for UI
     * @private
     * @param {string|null} statusFilter - Applied filter
     * @returns {Object} Filter metadata
     */
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

    /**
     * Format date to Vietnamese format: DD/MM/YYYY HH:mm
     * @private
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    _formatDate(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    /**
     * Calculate human-readable overdue message
     * @private
     * @param {Date|string} deadline - Task deadline
     * @returns {string|null} Overdue message
     */
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
