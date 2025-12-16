const { DomainException } = require('../../../domain/exceptions/DomainException');
const { DeleteTaskInputDTO, DeleteTaskOutputDTO } = require('../../dto/DeleteTaskDTO');

/**
 * Delete Task Use Case
 * Orchestrates task deletion with authorization
 * NOTE: This is now a SOFT DELETE (Cancel) operation
 * Task status changes to CANCELLED instead of being deleted from database
 */
class DeleteTaskUseCase {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute task deletion (soft delete - cancel)
     * @param {DeleteTaskInputDTO} inputDTO 
     * @returns {Promise<DeleteTaskOutputDTO>}
     */
    async execute(inputDTO) {
        // Step 1: Validate input
        if (!inputDTO || !inputDTO.taskId || !inputDTO.userId) {
            throw DomainException.validationError('Task ID and User ID are required');
        }

        // Step 2: Find existing task
        const task = await this.taskRepository.findById(inputDTO.taskId);
        
        if (!task) {
            throw DomainException.entityNotFound('Task', inputDTO.taskId);
        }

        // Step 3: Authorization check
        if (!task.belongsToUser(inputDTO.userId)) {
            throw DomainException.unauthorized('You do not have permission to delete this task');
        }

        // Step 4: Soft delete - Cancel task (change status to CANCELLED)
        task.cancelTask();
        const updatedTask = await this.taskRepository.update(task);

        // Step 5: Return output DTO
        return new DeleteTaskOutputDTO(
            inputDTO.taskId,
            true,
            'Task cancelled successfully'
        );
    }
}

module.exports = { DeleteTaskUseCase };
