const { 
    CreateTaskInputDTO,
    UpdateTaskInputDTO,
    GetTasksInputDTO,
    GetTaskInputDTO,
    DeleteTaskInputDTO
} = require('../../business');
const { DomainException } = require('../../domain/exceptions/DomainException');

/**
 * Task Controller
 * Adapters layer - HTTP interface for task use cases
 */
class TaskController {
    constructor(
        createTaskUseCase,
        getTasksUseCase,
        getTaskByIdUseCase,
        updateTaskUseCase,
        deleteTaskUseCase,
        changeTaskStatusUseCase,
        getTaskStatisticsUseCase
    ) {
        this.createTaskUseCase = createTaskUseCase;
        this.getTasksUseCase = getTasksUseCase;
        this.getTaskByIdUseCase = getTaskByIdUseCase;
        this.updateTaskUseCase = updateTaskUseCase;
        this.deleteTaskUseCase = deleteTaskUseCase;
        this.changeTaskStatusUseCase = changeTaskStatusUseCase;
        this.getTaskStatisticsUseCase = getTaskStatisticsUseCase;
    }

    /**
     * POST /api/tasks
     * Create a new task
     */
    async createTask(req, res) {
        try {
            const { title, description, startDate, deadline } = req.body;
            const userId = req.user.userId; // From auth middleware

            if (!title) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field: title'
                });
            }

            const inputDTO = new CreateTaskInputDTO(
                title, 
                description, 
                userId, 
                startDate ? new Date(startDate) : undefined,
                deadline ? new Date(deadline) : undefined
            );
            const outputDTO = await this.createTaskUseCase.execute(inputDTO);

            return res.status(201).json({
                success: true,
                task: {
                    id: outputDTO.taskId,
                    title: outputDTO.title,
                    description: outputDTO.description,
                    status: outputDTO.status,
                    startDate: outputDTO.startDate,
                    deadline: outputDTO.deadline,
                    created_at: outputDTO.createdAt
                },
                message: 'Task created successfully'
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * GET /api/tasks
     * Get all tasks for the authenticated user
     */
    async getTasks(req, res) {
        try {
            const userId = req.user.userId;
            const { status } = req.query; // Optional filter

            const inputDTO = new GetTasksInputDTO(userId, status);
            const outputDTO = await this.getTasksUseCase.execute(inputDTO);

            // Transform taskId to id for frontend compatibility
            const tasks = outputDTO.tasks.map(task => ({
                id: task.taskId,
                title: task.title,
                description: task.description,
                status: task.status,
                userId: task.userId,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                startDate: task.startDate,
                deadline: task.deadline,
                progress: task.progress,
                isOverdue: task.isOverdue
            }));

            return res.status(200).json({
                success: true,
                tasks: tasks,
                count: outputDTO.count
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * GET /api/tasks/:id
     * Get a single task by ID
     */
    async getTaskById(req, res) {
        try {
            const taskId = req.params.id;
            const userId = req.user.userId;

            const inputDTO = new GetTaskInputDTO(taskId, userId);
            const outputDTO = await this.getTaskByIdUseCase.execute(inputDTO);

            return res.status(200).json({
                success: true,
                task: {
                    id: outputDTO.taskId,
                    title: outputDTO.title,
                    description: outputDTO.description,
                    status: outputDTO.status,
                    created_at: outputDTO.createdAt,
                    updated_at: outputDTO.updatedAt,
                    startDate: outputDTO.startDate,
                    deadline: outputDTO.deadline,
                    progress: outputDTO.progress,
                    isOverdue: outputDTO.isOverdue
                }
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * PUT /api/tasks/:id
     * Update a task
     */
    async updateTask(req, res) {
        try {
            const taskId = req.params.id;
            const userId = req.user.userId;
            const { title, description, status, startDate, deadline } = req.body;

            const inputDTO = new UpdateTaskInputDTO(
                taskId, 
                title, 
                description, 
                status, 
                userId,
                startDate ? new Date(startDate) : undefined,
                deadline ? new Date(deadline) : undefined
            );
            const outputDTO = await this.updateTaskUseCase.execute(inputDTO);

            return res.status(200).json({
                success: true,
                task: {
                    id: outputDTO.taskId,
                    title: outputDTO.title,
                    description: outputDTO.description,
                    status: outputDTO.status,
                    updated_at: outputDTO.updatedAt,
                    startDate: outputDTO.startDate,
                    deadline: outputDTO.deadline
                },
                message: 'Task updated successfully'
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * DELETE /api/tasks/:id
     * Delete a task
     */
    async deleteTask(req, res) {
        try {
            const taskId = req.params.id;
            const userId = req.user.userId;

            const inputDTO = new DeleteTaskInputDTO(taskId, userId);
            const outputDTO = await this.deleteTaskUseCase.execute(inputDTO);

            return res.status(200).json({
                success: outputDTO.success,
                message: outputDTO.message
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * PATCH /api/tasks/:id/status
     * Change task status
     */
    async changeStatus(req, res) {
        try {
            const taskId = req.params.id;
            const userId = req.user.userId;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required field: status'
                });
            }

            const result = await this.changeTaskStatusUseCase.execute(taskId, status, userId);

            return res.status(200).json({
                success: true,
                task: {
                    id: result.taskId,
                    status: result.status,
                    updated_at: result.updatedAt
                },
                message: 'Task status updated successfully'
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * GET /api/tasks/statistics
     * Get task statistics for user
     */
    async getStatistics(req, res) {
        try {
            const userId = req.user.userId;

            const statistics = await this.getTaskStatisticsUseCase.execute(userId);

            return res.status(200).json({
                success: true,
                statistics: statistics
            });

        } catch (error) {
            return this.handleError(res, error);
        }
    }

    /**
     * Handle errors with appropriate HTTP status codes
     */
    handleError(res, error) {
        if (error instanceof DomainException) {
            const statusCode = this.getStatusCodeForDomainException(error);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                errorCode: error.getErrorCode()
            });
        }

        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }

    /**
     * Map domain exception to HTTP status code
     */
    getStatusCodeForDomainException(exception) {
        const errorCode = exception.getErrorCode();
        switch (errorCode) {
            case 'VALIDATION_ERROR':
                return 400;
            case 'BUSINESS_RULE_VIOLATION':
                return 422;
            case 'UNAUTHORIZED':
                return 403;
            case 'ENTITY_NOT_FOUND':
                return 404;
            default:
                return 400;
        }
    }
}

module.exports = { TaskController };
