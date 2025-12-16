const { GetTaskStatisticsUseCase } = require('../../../business/usecases/tasks/GetTaskStatisticsUseCase');
const { TaskStatus } = require('../../../domain/valueobjects/TaskStatus');

describe('GetTaskStatisticsUseCase', () => {
    let useCase;
    let mockTaskRepository;

    beforeEach(() => {
        mockTaskRepository = {
            countByUserIdAndStatus: jest.fn()
        };

        useCase = new GetTaskStatisticsUseCase(mockTaskRepository);
    });

    describe('Successful statistics retrieval', () => {
        it('should get statistics for user with tasks', async () => {
            // Arrange
            mockTaskRepository.countByUserIdAndStatus
                .mockResolvedValueOnce(3)  // pending
                .mockResolvedValueOnce(2)  // in progress
                .mockResolvedValueOnce(5); // completed

            // Act
            const result = await useCase.execute('user123');

            // Assert
            expect(result.totalTasks).toBe(10);
            expect(result.pendingTasks).toBe(3);
            expect(result.inProgressTasks).toBe(2);
            expect(result.completedTasks).toBe(5);
            expect(result.completionRate).toBe(50);
            expect(mockTaskRepository.countByUserIdAndStatus).toHaveBeenCalledTimes(3);
        });

        it('should return zero statistics for user with no tasks', async () => {
            mockTaskRepository.countByUserIdAndStatus
                .mockResolvedValueOnce(0)  // pending
                .mockResolvedValueOnce(0)  // in progress
                .mockResolvedValueOnce(0); // completed

            const result = await useCase.execute('user123');

            expect(result.totalTasks).toBe(0);
            expect(result.completionRate).toBe(0);
        });

        it('should calculate 100% completion rate when all tasks completed', async () => {
            mockTaskRepository.countByUserIdAndStatus
                .mockResolvedValueOnce(0)  // pending
                .mockResolvedValueOnce(0)  // in progress
                .mockResolvedValueOnce(5); // completed

            const result = await useCase.execute('user123');

            expect(result.completionRate).toBe(100);
            expect(result.total).toBe(result.completed);
        });
    });

    describe('Validation errors', () => {
        it('should throw error for missing userId', async () => {
            await expect(useCase.execute('')).rejects.toThrow('User ID is required');
        });

        it('should throw error for null input', async () => {
            await expect(useCase.execute(null)).rejects.toThrow(Error);
        });
    });
});
