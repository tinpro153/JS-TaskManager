/**
 * Task Display DTO (Data Transfer Object)
 * Business Layer - Input/Output for GetTaskForDisplay Use Case
 * 
 * Separates internal domain models from external API contracts.
 * Frontend receives this DTO, not raw domain entities.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

class TaskDisplayDTO {
    /**
     * Create task display DTO for API response
     * @param {Object} params - Task display parameters
     * @param {string} params.id - Task UUID
     * @param {string} params.title - Task title
     * @param {string} params.description - Task description
     * @param {string} params.status - Task status (SCHEDULED | PENDING | IN_PROGRESS | COMPLETED | FAILED | CANCELLED)
     * @param {string} params.userId - Owner user ID
     * @param {string} params.createdAt - ISO 8601 creation timestamp
     * @param {string} params.updatedAt - ISO 8601 update timestamp
     * @param {string} params.startDate - ISO 8601 start date
     * @param {string|null} params.deadline - ISO 8601 deadline or null
     * @param {number} params.progress - Progress percentage (0-100)
     * @param {boolean} params.isOverdue - Whether task is overdue
     * @param {TaskDisplayData} params.displayData - Display data value object
     */
    constructor({
        id,
        title,
        description,
        status,
        userId,
        createdAt,
        updatedAt,
        startDate,
        deadline,
        progress,
        isOverdue,
        displayData
    }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.status = status;
        this.userId = userId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.startDate = startDate;
        this.deadline = deadline;
        this.progress = progress;
        this.isOverdue = isOverdue;

        // Display data (calculated by backend)
        this.statusText = displayData.statusText;
        this.statusClass = displayData.statusClass;
        this.progressColor = displayData.progressColor;
        this.startDateFormatted = displayData.startDateFormatted;
        this.deadlineFormatted = displayData.deadlineFormatted;
        this.overdueMessage = displayData.overdueMessage;
        this.availableActions = displayData.availableActions;
        this.canEdit = displayData.canEdit;
        this.canDelete = displayData.canDelete;
        this.canComplete = displayData.canComplete;
        this.icon = displayData.icon;
    }

    /**
     * Convert to API response format
     * @returns {Object} Plain object for JSON serialization
     */
    toJSON() {
        return {
            // Core task data
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            userId: this.userId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            startDate: this.startDate,
            deadline: this.deadline,
            progress: this.progress,
            isOverdue: this.isOverdue,

            // Display data (pre-calculated by backend)
            statusText: this.statusText,
            statusClass: this.statusClass,
            progressColor: this.progressColor,
            startDateFormatted: this.startDateFormatted,
            deadlineFormatted: this.deadlineFormatted,
            overdueMessage: this.overdueMessage,
            availableActions: this.availableActions,
            canEdit: this.canEdit,
            canDelete: this.canDelete,
            canComplete: this.canComplete,
            icon: this.icon
        };
    }
}

module.exports = TaskDisplayDTO;
