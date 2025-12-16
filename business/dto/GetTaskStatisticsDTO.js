/**
 * Input DTO for getting task statistics
 */
class GetTaskStatisticsInputDTO {
    constructor(userId) {
        this.userId = userId;
    }
}

/**
 * Output DTO for task statistics
 */
class GetTaskStatisticsOutputDTO {
    constructor(total, pending, inProgress, completed, completionRate) {
        this.totalTasks = total;
        this.pendingTasks = pending;
        this.inProgressTasks = inProgress;
        this.completedTasks = completed;
        this.completionRate = completionRate;
    }
}

module.exports = { GetTaskStatisticsInputDTO, GetTaskStatisticsOutputDTO };
