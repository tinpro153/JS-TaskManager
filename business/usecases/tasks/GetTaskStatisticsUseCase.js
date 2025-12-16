const { TaskStatus } = require('../../../domain/valueobjects/TaskStatus');
const { GetTaskStatisticsInputDTO, GetTaskStatisticsOutputDTO } = require('../../dto/GetTaskStatisticsDTO');

/**
 * Get Task Statistics Use Case
 * Provides task counts by status for a user
 */
class GetTaskStatisticsUseCase {
    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Execute get task statistics
     * @param {string} userId 
     * @returns {Promise<Object>}
     */
    async execute(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        // Get counts for each status
        const [pendingCount, inProgressCount, completedCount] = await Promise.all([
            this.taskRepository.countByUserIdAndStatus(userId, TaskStatus.PENDING),
            this.taskRepository.countByUserIdAndStatus(userId, TaskStatus.IN_PROGRESS),
            this.taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED)
        ]);

        const totalCount = pendingCount + inProgressCount + completedCount;
        const completionRate = totalCount > 0 
            ? Math.round((completedCount / totalCount) * 100) 
            : 0;

        return new GetTaskStatisticsOutputDTO(
            totalCount,
            pendingCount,
            inProgressCount,
            completedCount,
            completionRate
        );
    }
}

module.exports = { GetTaskStatisticsUseCase };
