
const TaskDisplayDTO = require('../dto/TaskDisplayDTO');
const TaskDisplayData = require('../../domain/valueobjects/TaskDisplayData');

class GetTaskForDisplayUseCase {

    constructor(taskRepository) {
        this.taskRepository = taskRepository;
    }

    async execute(taskId, userId) {
        //Fetch task from repository
        const task = await this.taskRepository.findById(taskId);

        if (!task) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            error.errorCode = 'TASK_NOT_FOUND';
            throw error;
        }

        //Validate ownership
        if (task.getUserId() !== userId) {
            const error = new Error('You do not have permission to access this task');
            error.statusCode = 403;
            error.errorCode = 'FORBIDDEN';
            throw error;
        }

        //Calculate display data (THIS IS THE KEY - backend does ALL the work)
        const displayData = this._calculateDisplayData(task);
        
        //Format createdAt
        const createdAtFormatted = this._formatDate(task.getCreatedAt());

        //Build DTO using entity getters
        const dto = new TaskDisplayDTO({
            id: task.getId(),
            title: task.getTitle(),
            description: task.getDescription() || '',
            status: task.getStatus(),
            userId: task.getUserId(),
            createdAt: task.getCreatedAt(),
            updatedAt: task.getUpdatedAt(),
            startDate: task.getStartDate(),
            deadline: task.getDeadline(),
            progress: task.getProgressPercentage() || 0,
            isOverdue: task.isOverdue(),
            displayData,
            createdAtFormatted
        });

        return dto;
    }

    _calculateDisplayData(task) {
        //Use getters from Task entity
        const status = task.getStatus();
        const startDate = task.getStartDate();
        const deadline = task.getDeadline();
        const progress = task.getProgressPercentage();
        const isOverdue = task.isOverdue();

        //Format dates (backend responsibility)
        const startDateFormatted = this._formatDate(startDate);
        const deadlineFormatted = deadline ? this._formatDate(deadline) : null;

        //Calculate overdue message (backend logic)
        const overdueMessage = isOverdue ? this._calculateOverdueMessage(deadline) : null;

        //Use factory methods from TaskDisplayData based on status
        switch (status) {
            case 'PENDING':
                return TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);

            case 'IN_PROGRESS':
                return TaskDisplayData.forInProgress(
                    startDateFormatted,
                    deadlineFormatted,
                    progress || 0,
                    overdueMessage
                );

            case 'COMPLETED':
                return TaskDisplayData.forCompleted(startDateFormatted, deadlineFormatted);

            default:
                //Fallback for unknown status
                return TaskDisplayData.forPending(startDateFormatted, deadlineFormatted, overdueMessage);
        }
    }

    _formatDate(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';

        // Use toLocaleString with Asia/Ho_Chi_Minh timezone for consistent formatting
        // This ensures dates display correctly regardless of server timezone (UTC in Docker)
        try {
            const options = {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            
            const formatted = d.toLocaleString('en-GB', options);
            // Format: "DD/MM/YYYY, HH:MM" -> "DD/MM/YYYY HH:MM"
            return formatted.replace(',', '');
        } catch (error) {
            // Fallback to UTC if timezone not supported
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            const hours = String(d.getUTCHours()).padStart(2, '0');
            const minutes = String(d.getUTCMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
    }

    _calculateOverdueMessage(deadline) {
        if (!deadline) return null;

        const now = new Date();
        const deadlineDate = new Date(deadline);
        const diffMs = now - deadlineDate;

        if (diffMs <= 0) return null; // Not overdue

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            return `Quá hạn ${diffDays} ngày`;
        } else if (diffHours > 0) {
            return `Quá hạn ${diffHours} giờ`;
        } else {
            return `Quá hạn ${diffMinutes} phút`;
        }
    }
}

module.exports = GetTaskForDisplayUseCase;
