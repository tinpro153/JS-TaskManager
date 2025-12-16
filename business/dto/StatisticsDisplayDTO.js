/**
 * Statistics Display DTO (Data Transfer Object)
 * Business Layer - Output for GetStatisticsForDisplay Use Case
 * 
 * Enriches raw statistics with formatted strings and actionable insights.
 * Frontend receives complete, ready-to-display data.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

class StatisticsDisplayDTO {
    /**
     * Create statistics display DTO for API response
     * @param {Object} params - Statistics parameters
     * @param {number} params.totalTasks - Total number of tasks (excluding cancelled)
     * @param {number} params.scheduledTasks - Number of scheduled tasks (future)
     * @param {number} params.pendingTasks - Number of pending tasks
     * @param {number} params.inProgressTasks - Number of in-progress tasks
     * @param {number} params.completedTasks - Number of completed tasks
     * @param {number} params.failedTasks - Number of failed tasks
     * @param {number} params.cancelledTasks - Number of cancelled tasks
     * @param {number} params.overdueTasks - Number of overdue tasks
     * @param {number} params.completionRate - Completion rate percentage
     * @param {Array<StatisticsInsight>} params.insights - Array of insights
     */
    constructor({
        totalTasks,
        scheduledTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        failedTasks,
        cancelledTasks,
        overdueTasks,
        completionRate,
        insights = []
    }) {
        // Raw numbers
        this.totalTasks = totalTasks;
        this.scheduledTasks = scheduledTasks;
        this.pendingTasks = pendingTasks;
        this.inProgressTasks = inProgressTasks;
        this.completedTasks = completedTasks;
        this.failedTasks = failedTasks;
        this.cancelledTasks = cancelledTasks;
        this.overdueTasks = overdueTasks;
        this.completionRate = completionRate;

        // Formatted strings (backend calculates)
        this.totalTasksFormatted = this._formatTaskCount(totalTasks);
        this.scheduledTasksFormatted = this._formatTaskCount(scheduledTasks, 'đang chờ');
        this.pendingTasksFormatted = this._formatTaskCount(pendingTasks, 'chờ xử lý');
        this.inProgressTasksFormatted = this._formatTaskCount(inProgressTasks, 'đang làm');
        this.completedTasksFormatted = this._formatTaskCount(completedTasks, 'hoàn thành');
        this.failedTasksFormatted = this._formatTaskCount(failedTasks, 'không hoàn thành');
        this.cancelledTasksFormatted = this._formatTaskCount(cancelledTasks, 'đã hủy');
        this.overdueTasksFormatted = this._formatTaskCount(overdueTasks, 'quá hạn');
        this.completionRateFormatted = `${completionRate}%`;

        // Insights (generated from business rules)
        this.insights = insights.map(insight => insight.toJSON());
    }

    /**
     * Format task count with context
     * @private
     * @param {number} count - Task count
     * @param {string} [context='công việc'] - Context text
     * @returns {string} Formatted string (e.g., '5 đang chờ', '10 công việc')
     */
    _formatTaskCount(count, context = 'công việc') {
        if (count === 0) {
            return `0 ${context}`;
        }
        return `${count} ${context}`;
    }

    /**
     * Convert to API response format
     * @returns {Object} Plain object for JSON serialization
     */
    toJSON() {
        return {
            // Raw numbers
            totalTasks: this.totalTasks,
            scheduledTasks: this.scheduledTasks,
            pendingTasks: this.pendingTasks,
            inProgressTasks: this.inProgressTasks,
            completedTasks: this.completedTasks,
            failedTasks: this.failedTasks,
            cancelledTasks: this.cancelledTasks,
            overdueTasks: this.overdueTasks,
            completionRate: this.completionRate,

            // Formatted strings
            totalTasksFormatted: this.totalTasksFormatted,
            scheduledTasksFormatted: this.scheduledTasksFormatted,
            pendingTasksFormatted: this.pendingTasksFormatted,
            inProgressTasksFormatted: this.inProgressTasksFormatted,
            completedTasksFormatted: this.completedTasksFormatted,
            failedTasksFormatted: this.failedTasksFormatted,
            cancelledTasksFormatted: this.cancelledTasksFormatted,
            overdueTasksFormatted: this.overdueTasksFormatted,
            completionRateFormatted: this.completionRateFormatted,

            // Insights
            insights: this.insights
        };
    }
}

module.exports = StatisticsDisplayDTO;
