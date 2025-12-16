/**
 * Task Display Data Value Object
 * Domain Layer - Pure business logic, no dependencies
 * 
 * Encapsulates all presentation data for a task that frontend needs to render.
 * This keeps display logic OUT of the frontend and IN the backend where it belongs.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

class TaskDisplayData {
    /**
     * Create immutable display data for a task
     * @param {Object} params - Display data parameters
     * @param {string} params.statusText - Localized status text (e.g., 'Đang chờ', 'Đang làm', 'Hoàn thành')
     * @param {string} params.statusClass - CSS class for status styling ('pending' | 'in-progress' | 'completed')
     * @param {string} params.progressColor - Progress bar color ('safe' | 'warning' | 'danger' | 'completed')
     * @param {string} params.startDateFormatted - Formatted start date (e.g., '16/12/2025 10:30')
     * @param {string|null} params.deadlineFormatted - Formatted deadline or null if no deadline
     * @param {string|null} params.overdueMessage - Overdue message (e.g., 'Quá hạn 2 ngày') or null
     * @param {Array<string>} params.availableActions - Array of available actions (['edit', 'delete', 'complete'])
     * @param {boolean} params.canEdit - Whether user can edit this task
     * @param {boolean} params.canDelete - Whether user can delete this task
     * @param {boolean} params.canComplete - Whether user can mark as complete
     * @param {string} params.icon - Icon/emoji for task card (e.g., '📋', '🔄', '✅')
     * @throws {Error} When required fields are missing or invalid
     */
    constructor({
        statusText,
        statusClass,
        progressColor,
        startDateFormatted,
        deadlineFormatted = null,
        overdueMessage = null,
        availableActions = [],
        canEdit = false,
        canDelete = false,
        canComplete = false,
        icon = '📋'
    }) {
        // Validate required fields
        if (!statusText || typeof statusText !== 'string') {
            throw new Error('statusText is required and must be a string');
        }
        if (!statusClass || typeof statusClass !== 'string') {
            throw new Error('statusClass is required and must be a string');
        }
        if (!progressColor || typeof progressColor !== 'string') {
            throw new Error('progressColor is required and must be a string');
        }
        if (!startDateFormatted || typeof startDateFormatted !== 'string') {
            throw new Error('startDateFormatted is required and must be a string');
        }
        if (!Array.isArray(availableActions)) {
            throw new Error('availableActions must be an array');
        }

        // Validate enum values
        const validStatusClasses = ['scheduled', 'pending', 'in-progress', 'completed', 'failed', 'cancelled'];
        if (!validStatusClasses.includes(statusClass)) {
            throw new Error(`statusClass must be one of: ${validStatusClasses.join(', ')}`);
        }

        const validProgressColors = ['safe', 'warning', 'danger', 'completed'];
        if (!validProgressColors.includes(progressColor)) {
            throw new Error(`progressColor must be one of: ${validProgressColors.join(', ')}`);
        }

        const validActions = ['edit', 'delete', 'complete', 'view'];
        for (const action of availableActions) {
            if (!validActions.includes(action)) {
                throw new Error(`Invalid action '${action}'. Must be one of: ${validActions.join(', ')}`);
            }
        }

        // Freeze to make immutable
        Object.defineProperties(this, {
            statusText: { value: statusText, enumerable: true },
            statusClass: { value: statusClass, enumerable: true },
            progressColor: { value: progressColor, enumerable: true },
            startDateFormatted: { value: startDateFormatted, enumerable: true },
            deadlineFormatted: { value: deadlineFormatted, enumerable: true },
            overdueMessage: { value: overdueMessage, enumerable: true },
            availableActions: { value: Object.freeze([...availableActions]), enumerable: true },
            canEdit: { value: Boolean(canEdit), enumerable: true },
            canDelete: { value: Boolean(canDelete), enumerable: true },
            canComplete: { value: Boolean(canComplete), enumerable: true },
            icon: { value: icon, enumerable: true }
        });

        Object.freeze(this);
    }

    /**
     * Factory method: Create display data for SCHEDULED task (future startDate)
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @returns {TaskDisplayData} Display data instance
     */
    static forScheduled(startDateFormatted, deadlineFormatted = null) {
        return new TaskDisplayData({
            statusText: 'Đang chờ',
            statusClass: 'scheduled',
            progressColor: 'safe',
            startDateFormatted,
            deadlineFormatted,
            overdueMessage: null,
            availableActions: ['edit', 'delete'],
            canEdit: true,
            canDelete: true,
            canComplete: false, // Cannot complete until startDate
            icon: '📅'
        });
    }

    /**
     * Factory method: Create display data for PENDING task
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @param {string|null} overdueMessage - Overdue message if applicable
     * @returns {TaskDisplayData} Display data instance
     */
    static forPending(startDateFormatted, deadlineFormatted = null, overdueMessage = null) {
        return new TaskDisplayData({
            statusText: 'Đang chờ',
            statusClass: 'pending',
            progressColor: 'safe',
            startDateFormatted,
            deadlineFormatted,
            overdueMessage,
            availableActions: ['edit', 'delete', 'complete'],
            canEdit: true,
            canDelete: true,
            canComplete: true,
            icon: '⏸️'
        });
    }

    /**
     * Factory method: Create display data for IN_PROGRESS task
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @param {number} progress - Progress percentage (0-100)
     * @param {string|null} overdueMessage - Overdue message if applicable
     * @returns {TaskDisplayData} Display data instance
     */
    static forInProgress(startDateFormatted, deadlineFormatted = null, progress = 0, overdueMessage = null) {
        let progressColor = 'safe';
        if (progress >= 80) {
            progressColor = 'danger';
        } else if (progress >= 50) {
            progressColor = 'warning';
        }

        return new TaskDisplayData({
            statusText: 'Đang làm',
            statusClass: 'in-progress',
            progressColor,
            startDateFormatted,
            deadlineFormatted,
            overdueMessage,
            availableActions: ['edit', 'delete', 'complete'],
            canEdit: true,
            canDelete: true,
            canComplete: true,
            icon: '🔄'
        });
    }

    /**
     * Factory method: Create display data for COMPLETED task
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @returns {TaskDisplayData} Display data instance
     */
    static forCompleted(startDateFormatted, deadlineFormatted = null) {
        return new TaskDisplayData({
            statusText: 'Hoàn thành',
            statusClass: 'completed',
            progressColor: 'completed',
            startDateFormatted,
            deadlineFormatted,
            overdueMessage: null, // Completed tasks can't be overdue
            availableActions: ['view', 'delete'], // Can't edit or complete again
            canEdit: false,
            canDelete: true,
            canComplete: false,
            icon: '✅'
        });
    }

    /**
     * Factory method: Create display data for FAILED task
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @param {string|null} overdueMessage - Overdue message
     * @returns {TaskDisplayData} Display data instance
     */
    static forFailed(startDateFormatted, deadlineFormatted = null, overdueMessage = null) {
        return new TaskDisplayData({
            statusText: 'Không hoàn thành',
            statusClass: 'failed',
            progressColor: 'danger',
            startDateFormatted,
            deadlineFormatted,
            overdueMessage,
            availableActions: ['view', 'delete', 'complete'], // Can complete failed tasks
            canEdit: false,
            canDelete: true,
            canComplete: true, // Allow completing failed tasks
            icon: '❌'
        });
    }

    /**
     * Factory method: Create display data for CANCELLED task (soft deleted)
     * @param {string} startDateFormatted - Formatted start date
     * @param {string|null} deadlineFormatted - Formatted deadline
     * @returns {TaskDisplayData} Display data instance
     */
    static forCancelled(startDateFormatted, deadlineFormatted = null) {
        return new TaskDisplayData({
            statusText: 'Đã hủy',
            statusClass: 'cancelled',
            progressColor: 'safe',
            startDateFormatted,
            deadlineFormatted,
            overdueMessage: null,
            availableActions: ['view'], // Can only view cancelled tasks
            canEdit: false,
            canDelete: false,
            canComplete: false,
            icon: '🚫'
        });
    }

    /**
     * Convert to plain object for JSON serialization
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            statusText: this.statusText,
            statusClass: this.statusClass,
            progressColor: this.progressColor,
            startDateFormatted: this.startDateFormatted,
            deadlineFormatted: this.deadlineFormatted,
            overdueMessage: this.overdueMessage,
            availableActions: [...this.availableActions],
            canEdit: this.canEdit,
            canDelete: this.canDelete,
            canComplete: this.canComplete,
            icon: this.icon
        };
    }
}

module.exports = TaskDisplayData;
