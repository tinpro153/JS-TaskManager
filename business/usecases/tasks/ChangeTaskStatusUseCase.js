const { DomainException } = require('../../../domain/exceptions/DomainException');
const { TaskStatus } = require('../../../domain/valueobjects/TaskStatus');
const { ChangeTaskStatusInputDTO, ChangeTaskStatusOutputDTO } = require('../../dto/ChangeTaskStatusDTO');

/**
 * Change Task Status Use Case
 * Specialized use case for status transitions with business rules
 */
class ChangeTaskStatusUseCase {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute task status change
     * @param {string} taskId 
     * @param {string} newStatus 
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async execute(taskId, newStatus, userId) {
        // Step 1: Validate input
        if (!taskId || !newStatus || !userId) {
            throw DomainException.validationError('Task ID, status, and User ID are required');
        }

        // Step 2: Find task
        const task = await this.taskRepository.findById(taskId);
        
        if (!task) {
            throw DomainException.entityNotFound('Task', taskId);
        }

        // Step 3: Authorization check
        if (!task.belongsToUser(userId)) {
            throw DomainException.unauthorized('You do not have permission to update this task');
        }

        // Step 4: Update status using domain logic (enforces business rules)
        try {
            task.updateStatus(newStatus);
        } catch (error) {
            if (error instanceof DomainException) {
                throw error;
            }
            throw DomainException.validationError(error.message);
        }

        // Step 5: Persist changes
        const updatedTask = await this.taskRepository.update(task);

        // Step 6: Return result using DTO
        return ChangeTaskStatusOutputDTO.fromTask(updatedTask);
    }

    /**
     * Helper: Mark task as in progress
     */
    async markAsInProgress(taskId, userId) {
        return this.execute(taskId, TaskStatus.IN_PROGRESS, userId);
    }

    /**
     * Helper: Mark task as completed
     */
    async markAsCompleted(taskId, userId) {
        return this.execute(taskId, TaskStatus.COMPLETED, userId);
    }

    /**
     * Helper: Reopen task
     */
    async reopenTask(taskId, userId) {
        const task = await this.taskRepository.findById(taskId);
        
        if (!task) {
            throw DomainException.entityNotFound('Task', taskId);
        }

        if (!task.belongsToUser(userId)) {
            throw DomainException.unauthorized('You do not have permission to update this task');
        }

        task.reopen();
        const updatedTask = await this.taskRepository.update(task);

        return ChangeTaskStatusOutputDTO.fromTask(updatedTask);
    }
}

module.exports = { ChangeTaskStatusUseCase };
