/**
 * Input DTO for creating a task
 */
class CreateTaskInputDTO {
    constructor(title, description, userId, startDate = null, deadline = null) {
        this.title = title;
        this.description = description;
        this.userId = userId;
        this.startDate = startDate;
        this.deadline = deadline;
    }
}

/**
 * Output DTO for created task
 */
class CreateTaskOutputDTO {
    constructor(taskId, title, description, status, userId, startDate, deadline, createdAt) {
        this.taskId = taskId;
        this.title = title;
        this.description = description;
        this.status = status;
        this.userId = userId;
        this.startDate = startDate;
        this.deadline = deadline;
        this.createdAt = createdAt;
    }

    static fromTask(task) {
        return new CreateTaskOutputDTO(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getUserId(),
            task.getStartDate(),
            task.getDeadline(),
            task.getCreatedAt()
        );
    }
}

module.exports = { CreateTaskInputDTO, CreateTaskOutputDTO };
