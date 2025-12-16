/**
 * Task Display Routes
 * Infrastructure Layer - HTTP routing for task display endpoints
 * 
 * Maps HTTP endpoints to controller methods.
 * All routes require JWT authentication.
 * 
 * @author Clean Architecture Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

/**
 * Configure task display routes
 * @param {Object} dependencies - Dependency injection container
 * @param {Function} dependencies.verifyToken - JWT verification middleware
 * @param {TaskDisplayController} dependencies.taskDisplayController - Display controller
 * @returns {express.Router} Configured router
 */
function configureTaskDisplayRoutes(dependencies) {
    const { verifyToken, taskDisplayController } = dependencies;

    /**
     * @route GET /api/tasks/statistics/display
     * @desc Fetch statistics with formatted data and insights
     * @access Private (requires JWT)
     * @response {200} { success: true, statistics: {...} }
     * @response {401} Unauthorized - Invalid/expired token
     * @response {500} Internal server error
     */
    router.get(
        '/statistics/display',
        verifyToken,
        (req, res, next) => taskDisplayController.getStatisticsForDisplay(req, res, next)
    );

    /**
     * @route GET /api/tasks/display
     * @desc Fetch task list with full display enrichment
     * @access Private (requires JWT)
     * @query {string} [status] - Optional status filter (SCHEDULED|IN_PROGRESS|COMPLETED|FAILED|CANCELLED)
     * @response {200} { success: true, tasks: [...], count: number, filter: {}, emptyMessage: string }
     * @response {400} Bad request - Invalid status filter
     * @response {401} Unauthorized - Invalid/expired token
     * @response {500} Internal server error
     * @example
     * GET /api/tasks/display
     * GET /api/tasks/display?status=PENDING
     * GET /api/tasks/display?status=COMPLETED
     */
    router.get(
        '/display',
        verifyToken,
        (req, res, next) => taskDisplayController.getTaskListForDisplay(req, res, next)
    );

    /**
     * @route GET /api/tasks/:id/display
     * @desc Fetch single task with full display data
     * @access Private (requires JWT)
     * @param {string} id - Task UUID
     * @response {200} { success: true, task: {...} }
     * @response {401} Unauthorized - Invalid/expired token
     * @response {403} Forbidden - Task doesn't belong to user
     * @response {404} Not found - Task doesn't exist
     * @response {500} Internal server error
     */
    router.get(
        '/:id/display',
        verifyToken,
        (req, res, next) => taskDisplayController.getTaskForDisplay(req, res, next)
    );

    return router;
}

module.exports = configureTaskDisplayRoutes;
