const { DomainException } = require('../../../domain/exceptions/DomainException');
const { UpdateTaskInputDTO, UpdateTaskOutputDTO } = require('../../dto/UpdateTaskDTO');

/**
 * Update Task Use Case
 * Orchestrates task update with validation and authorization
 */
class UpdateTaskUseCase {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute task update
     * @param {UpdateTaskInputDTO} inputDTO 
     * @returns {Promise<UpdateTaskOutputDTO>}
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
            throw DomainException.unauthorized('You do not have permission to update this task');
        }

        // Step 4: Update task using domain logic
        try {
            task.update(inputDTO.title, inputDTO.description, inputDTO.status, inputDTO.startDate, inputDTO.deadline);
        } catch (error) {
            if (error instanceof DomainException) {
                throw error;
            }
            throw DomainException.validationError(error.message);
        }

        // Step 5: Persist changes
        const updatedTask = await this.taskRepository.update(task);

        // Step 6: Return output DTO
        return UpdateTaskOutputDTO.fromTask(updatedTask);
    }
}

module.exports = { UpdateTaskUseCase };
