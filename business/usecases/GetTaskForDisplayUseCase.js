/**
 * Get Task For Display Use Case
 * Business Layer - Orchestrates task retrieval with full display data
 * 
 * This use case:
 * 1. Fetches task from repository
 * 2. Validates ownership
 * 3. Calculates ALL display data (colors, formats, permissions)
 * 4. Returns ready-to-render DTO
 * 
 * Frontend receives ZERO business logic - just render data.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

const TaskDisplayDTO = require('../dto/TaskDisplayDTO');
const TaskDisplayData = require('../../domain/valueobjects/TaskDisplayData');

class GetTaskForDisplayUseCase {
    /**
     * @param {Object} taskRepository - Task repository port (interface)
     */
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute use case
     * @param {string} taskId - Task UUID to fetch
     * @param {string} userId - Current user ID (from JWT)
     * @returns {Promise<TaskDisplayDTO>} Task with full display data
     * @throws {Error} When task not found or user doesn't have permission
     */
    async execute(taskId, userId) {
        // Step 1: Fetch task from repository
        const task = await this.taskRepository.findById(taskId);

        if (!task) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            error.errorCode = 'TASK_NOT_FOUND';
            throw error;
        }

        // Step 2: Validate ownership
        if (task.getUserId() !== userId) {
            const error = new Error('You do not have permission to access this task');
            error.statusCode = 403;
            error.errorCode = 'FORBIDDEN';
            throw error;
        }

        // Step 3: Calculate display data (THIS IS THE KEY - backend does ALL the work)
        const displayData = this._calculateDisplayData(task);

        // Step 4: Build DTO using entity getters
        const dto = new TaskDisplayDTO({
            id: task.getId(),
            title: task.getTitle(),
            description: task.getDescription() || '',
            status: task.getStatus(),
            userId: task.getUserId(),
            createdAt: task.getCreatedAt(),
            updatedAt: task.getUpdatedAt(),
            startDate: task.getStartDate(),
            deadline: task.getDeadline(),
            progress: task.getProgressPercentage() || 0,
            isOverdue: task.isOverdue(),
            displayData
        });

        return dto;
    }

    /**
     * Calculate all display data for a task
     * This is where ALL presentation logic lives - not in frontend!
     * @private
     * @param {Task} task - Task entity from domain
     * @returns {TaskDisplayData} Display data value object
     */
    _calculateDisplayData(task) {
        // Use getters from Task entity
        const status = task.getStatus();
        const startDate = task.getStartDate();
        const deadline = task.getDeadline();
        const progress = task.getProgressPercentage();
        const isOverdue = task.isOverdue();

        // Format dates (backend responsibility)
        const startDateFormatted = this._formatDate(startDate);
        const deadlineFormatted = deadline ? this._formatDate(deadline) : null;

        // Calculate overdue message (backend logic)
        const overdueMessage = isOverdue ? this._calculateOverdueMessage(deadline) : null;

        // Use factory methods from TaskDisplayData based on status
        switch (status) {
            case 'PENDING':
                return TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);

            case 'IN_PROGRESS':
                return TaskDisplayData.forInProgress(
                    startDateFormatted,
                    deadlineFormatted,
                    progress || 0,
                    overdueMessage
                );

            case 'COMPLETED':
                return TaskDisplayData.forCompleted(startDateFormatted, deadlineFormatted);

            default:
                // Fallback for unknown status
                return TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);
        }
    }

    /**
     * Format date to Vietnamese format: DD/MM/YYYY HH:mm
     * Backend responsibility - frontend just displays the string
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
     * Backend logic - frontend just displays the message
     * @private
     * @param {Date|string} deadline - Task deadline
     * @returns {string} Overdue message (e.g., 'Quá hạn 2 ngày', 'Quá hạn 5 giờ')
     */
    _calculateOverdueMessage(deadline) {
        if (!deadline) return null;

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = now - deadlineDate;

        if (diffMs <= 0) return null; // Not overdue

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

module.exports = GetTaskForDisplayUseCase;
