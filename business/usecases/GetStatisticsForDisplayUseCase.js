/**
 * Get Statistics For Display Use Case
 * Business Layer - Fetches statistics with formatting and insights
 * 
 * This use case:
 * 1. Calculates raw statistics
 * 2. Formats numbers to Vietnamese strings
 * 3. Generates actionable insights based on business rules
 * 4. Returns StatisticsDisplayDTO
 * 
 * Frontend receives ready-to-display data with insights.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

const StatisticsDisplayDTO = require('../dto/StatisticsDisplayDTO');
const StatisticsInsight = require('../../domain/valueobjects/StatisticsInsight');

class GetStatisticsForDisplayUseCase {
    /**
     * @param {Object} taskRepository - Task repository port (interface)
     */
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute use case
     * @param {string} userId - Current user ID (from JWT)
     * @returns {Promise<StatisticsDisplayDTO>} Statistics with formatting and insights
     */
    async execute(userId) {
        // Step 1: Calculate raw statistics from repository
        const rawStats = await this._calculateStatistics(userId);

        // Step 2: Generate insights based on business rules
        const insights = StatisticsInsight.generateFromStatistics(rawStats);

        // Step 3: Build DTO with formatted data
        const dto = new StatisticsDisplayDTO({
            totalTasks: rawStats.totalTasks,
            scheduledTasks: rawStats.scheduledTasks,
            pendingTasks: rawStats.pendingTasks,
            inProgressTasks: rawStats.inProgressTasks,
            completedTasks: rawStats.completedTasks,
            failedTasks: rawStats.failedTasks,
            cancelledTasks: rawStats.cancelledTasks,
            overdueTasks: rawStats.overdueTasks,
            completionRate: rawStats.completionRate,
            insights
        });

        return dto;
    }

    /**
     * Calculate raw statistics from task repository
     * @private
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Raw statistics object
     */
    async _calculateStatistics(userId) {
        // Fetch all user tasks (no filter)
        const allTasks = await this.taskRepository.findByUserId(userId, null);

        // Auto-update task statuses (business logic)
        for (const task of allTasks) {
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

        // Calculate counts (after auto-marking)
        // Exclude CANCELLED tasks from total
        const activeTasks = allTasks.filter(t => t.status !== 'CANCELLED');
        const totalTasks = activeTasks.length;
        const scheduledTasks = activeTasks.filter(t => t.status === 'SCHEDULED').length;
        const pendingTasks = activeTasks.filter(t => t.status === 'PENDING').length;
        // Gộp PENDING vào IN_PROGRESS (đang làm)
        const inProgressTasks = activeTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length;
        const completedTasks = activeTasks.filter(t => t.status === 'COMPLETED').length;
        const failedTasks = activeTasks.filter(t => t.status === 'FAILED').length;
        const cancelledTasks = allTasks.filter(t => t.status === 'CANCELLED').length;
        const overdueTasks = activeTasks.filter(t => t.isOverdue()).length;

        // Calculate completion rate (exclude failed tasks from denominator)
        const completableTasksCount = totalTasks - failedTasks;
        const completionRate = completableTasksCount > 0 
            ? Math.round((completedTasks / completableTasksCount) * 100)
            : 0;

        return {
            totalTasks,
            scheduledTasks,
            pendingTasks,
            inProgressTasks,
            completedTasks,
            failedTasks,
            cancelledTasks,
            overdueTasks,
            completionRate
        };
    }
}

module.exports = GetStatisticsForDisplayUseCase;
