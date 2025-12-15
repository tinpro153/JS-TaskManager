const { Task } = require('../../../domain/entities/Task');
const { DomainException } = require('../../../domain/exceptions/DomainException');
const { CreateTaskInputDTO, CreateTaskOutputDTO } = require('../../dto/CreateTaskDTO');

/**
 * Create Task Use Case
 * Orchestrates task creation with validation
 */
class CreateTaskUseCase {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute task creation
     * @param {CreateTaskInputDTO} inputDTO 
     * @returns {Promise<CreateTaskOutputDTO>}
     */
    async execute(inputDTO) {
        // Step 1: Validate input
        if (!inputDTO || !inputDTO.title || !inputDTO.userId) {
            throw DomainException.validationError('Title and userId are required');
        }

        // Step 2: Create domain entity (with validation)
        const task = new Task(
            inputDTO.title,
            inputDTO.description,
            inputDTO.userId,
            inputDTO.startDate,
            inputDTO.deadline
        );

        // Step 3: Persist
        const savedTask = await this.taskRepository.save(task);

        // Step 4: Return output DTO
        return CreateTaskOutputDTO.fromTask(savedTask);
    }
}

module.exports = { CreateTaskUseCase };
