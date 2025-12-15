/**
 * Input DTO for updating a task
 */
class UpdateTaskInputDTO {
    constructor(taskId, title, description, status, userId, startDate = undefined, deadline = undefined) {
        this.taskId = taskId;
        this.title = title;
        this.description = description;
        this.status = status;
        this.userId = userId; // For authorization check
        this.startDate = startDate;
        this.deadline = deadline;
    }
}

/**
 * Output DTO for updated task
 */
class UpdateTaskOutputDTO {
    constructor(taskId, title, description, status, userId, startDate, deadline, updatedAt) {
        this.taskId = taskId;
        this.title = title;
        this.description = description;
        this.status = status;
        this.userId = userId;
        this.startDate = startDate;
        this.deadline = deadline;
        this.updatedAt = updatedAt;
    }

    static fromTask(task) {
        return new UpdateTaskOutputDTO(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getUserId(),
            task.getStartDate(),
            task.getDeadline(),
            task.getUpdatedAt()
        );
    }
}

module.exports = { UpdateTaskInputDTO, UpdateTaskOutputDTO };
