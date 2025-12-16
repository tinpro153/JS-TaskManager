/**
 * Task Display Controller
 * Adapters Layer - HTTP interface for task display endpoints
 * 
 * Handles HTTP requests for display-enriched task data.
 * Delegates business logic to use cases, formats responses via presenters.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

class TaskDisplayController {
    /**
     * @param {GetTaskForDisplayUseCase} getTaskForDisplayUseCase
     * @param {GetTaskListForDisplayUseCase} getTaskListForDisplayUseCase
     * @param {GetStatisticsForDisplayUseCase} getStatisticsForDisplayUseCase
     */
    constructor(
        getTaskForDisplayUseCase,
        getTaskListForDisplayUseCase,
        getStatisticsForDisplayUseCase
    ) {
        this.getTaskForDisplayUseCase = getTaskForDisplayUseCase;
        this.getTaskListForDisplayUseCase = getTaskListForDisplayUseCase;
        this.getStatisticsForDisplayUseCase = getStatisticsForDisplayUseCase;
    }

    /**
     * GET /api/tasks/:id/display
     * Fetch single task with full display data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getTaskForDisplay(req, res, next) {
        try {
            const taskId = req.params.id;
            const userId = req.user.userId; // From JWT middleware

            // Execute use case
            const taskDTO = await this.getTaskForDisplayUseCase.execute(taskId, userId);

            // Send response
            res.status(200).json({
                success: true,
                task: taskDTO.toJSON()
            });
        } catch (error) {
            next(error); // Pass to error handling middleware
        }
    }

    /**
     * GET /api/tasks/display?status=PENDING
     * Fetch task list with full display data and context
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getTaskListForDisplay(req, res, next) {
        try {
            const userId = req.user.userId; // From JWT middleware
            const statusFilter = req.query.status || null; // Optional status filter

            // Execute use case
            const result = await this.getTaskListForDisplayUseCase.execute(userId, statusFilter);

            // Send response
            res.status(200).json({
                success: true,
                tasks: result.tasks.map(dto => dto.toJSON()),
                count: result.count,
                filter: result.filter,
                emptyMessage: result.emptyMessage
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/tasks/statistics/display
     * Fetch statistics with formatting and insights
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware
     */
    async getStatisticsForDisplay(req, res, next) {
        try {
            const userId = req.user.userId; // From JWT middleware

            // Execute use case
            const statisticsDTO = await this.getStatisticsForDisplayUseCase.execute(userId);

            // Send response
            res.status(200).json({
                success: true,
                statistics: statisticsDTO.toJSON()
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = TaskDisplayController;
