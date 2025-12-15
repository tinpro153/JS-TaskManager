const { DomainException } = require('../exceptions/DomainException');
const { TaskStatus } = require('../valueobjects/TaskStatus');

/**
 * Task Entity - Pure domain object with business logic
 * NO framework dependencies allowed
 */
class Task {
    constructor(title, description, userId, startDate = null, deadline = null) {
        this.validateTitle(title);
        this.validateUserId(userId);
        if (deadline) {
            this.validateDeadline(deadline, startDate);
        }
        
        this.id = null; // Will be set by repository
        this.title = title.trim();
        this.description = description ? description.trim() : '';
        this.status = TaskStatus.PENDING; // Default status
        this.userId = userId;
        this.startDate = startDate || new Date();
        this.deadline = deadline;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Reconstruct task from database (skip validation)
     */
    static reconstruct(id, title, description, status, userId, startDate, deadline, createdAt, updatedAt) {
        const task = Object.create(Task.prototype);
        task.id = id;
        task.title = title;
        task.description = description;
        task.status = status;
        task.userId = userId;
        task.startDate = startDate;
        task.deadline = deadline;
        task.createdAt = createdAt;
        task.updatedAt = updatedAt;
        return task;
    }

    // Business validation methods
    validateTitle(title) {
        if (!title || typeof title !== 'string') {
            throw DomainException.validationError('Task title is required');
        }
        if (title.trim().length === 0) {
            throw DomainException.validationError('Task title cannot be empty');
        }
        if (title.length > 200) {
            throw DomainException.validationError('Task title must not exceed 200 characters');
        }
    }

    validateUserId(userId) {
        if (!userId) {
            throw DomainException.validationError('User ID is required for task');
        }
    }

    validateStatus(status) {
        if (!TaskStatus.isValid(status)) {
            throw DomainException.validationError(
                `Invalid task status. Must be one of: ${TaskStatus.getAllStatuses().join(', ')}`
            );
        }
    }

    validateDeadline(deadline, startDate = null) {
        if (!deadline) return;
        
        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime())) {
            throw DomainException.validationError('Invalid deadline date format');
        }
        
        if (startDate) {
            const start = new Date(startDate);
            if (deadlineDate < start) {
                throw DomainException.validationError('Deadline cannot be before start date');
            }
        }
    }

    // Business methods
    updateTitle(newTitle) {
        this.validateTitle(newTitle);
        this.title = newTitle.trim();
        this.updatedAt = new Date();
    }

    updateDescription(newDescription) {
        this.description = newDescription ? newDescription.trim() : '';
        this.updatedAt = new Date();
    }

    updateStatus(newStatus) {
        this.validateStatus(newStatus);
        
        // Business rule: Cannot go from COMPLETED back to PENDING directly
        if (this.status === TaskStatus.COMPLETED && newStatus === TaskStatus.PENDING) {
            throw DomainException.businessRuleViolation(
                'Cannot change completed task back to pending. Set to In Progress first.'
            );
        }
        
        this.status = newStatus;
        this.updatedAt = new Date();
    }

    update(title, description, status, startDate, deadline) {
        if (title !== undefined && title !== null) {
            this.updateTitle(title);
        }
        if (description !== undefined) {
            this.updateDescription(description);
        }
        if (status !== undefined && status !== null) {
            this.updateStatus(status);
        }
        if (startDate !== undefined && startDate !== null) {
            this.updateStartDate(startDate);
        }
        if (deadline !== undefined) {
            this.updateDeadline(deadline);
        }
        this.updatedAt = new Date();
    }

    updateStartDate(newStartDate) {
        const start = new Date(newStartDate);
        if (isNaN(start.getTime())) {
            throw DomainException.validationError('Invalid start date format');
        }
        if (this.deadline && start > new Date(this.deadline)) {
            throw DomainException.validationError('Start date cannot be after deadline');
        }
        this.startDate = start;
        this.updatedAt = new Date();
    }

    updateDeadline(newDeadline) {
        if (newDeadline) {
            this.validateDeadline(newDeadline, this.startDate);
            this.deadline = new Date(newDeadline);
        } else {
            this.deadline = null;
        }
        this.updatedAt = new Date();
    }

    markAsInProgress() {
        if (this.status === TaskStatus.COMPLETED) {
            throw DomainException.businessRuleViolation('Cannot restart a completed task');
        }
        this.status = TaskStatus.IN_PROGRESS;
        this.updatedAt = new Date();
    }

    markAsCompleted() {
        this.status = TaskStatus.COMPLETED;
        this.updatedAt = new Date();
    }

    reopen() {
        if (this.status === TaskStatus.COMPLETED) {
            this.status = TaskStatus.IN_PROGRESS;
        } else {
            this.status = TaskStatus.PENDING;
        }
        this.updatedAt = new Date();
    }

    // Check ownership
    belongsToUser(userId) {
        return this.userId === userId;
    }

    // Status checks
    isPending() {
        return this.status === TaskStatus.PENDING;
    }

    isInProgress() {
        return this.status === TaskStatus.IN_PROGRESS;
    }

    isCompleted() {
        return this.status === TaskStatus.COMPLETED;
    }

    // Getters
    getId() {
        return this.id;
    }

    getTitle() {
        return this.title;
    }

    getDescription() {
        return this.description;
    }

    getStatus() {
        return this.status;
    }

    getUserId() {
        return this.userId;
    }

    getCreatedAt() {
        return this.createdAt;
    }

    getUpdatedAt() {
        return this.updatedAt;
    }

    getStartDate() {
        return this.startDate;
    }

    getDeadline() {
        return this.deadline;
    }

    // Business method: Calculate progress based on time
    getProgressPercentage() {
        if (!this.deadline) return null;
        
        if (this.status === TaskStatus.COMPLETED) {
            return 100;
        }
        
        const now = new Date();
        const start = new Date(this.startDate);
        const end = new Date(this.deadline);
        
        if (now >= end) return 100; // Overdue
        if (now <= start) return 0;
        
        const totalTime = end - start;
        const elapsedTime = now - start;
        
        return Math.round((elapsedTime / totalTime) * 100);
    }

    // Business method: Check if task is overdue
    isOverdue() {
        if (!this.deadline || this.status === TaskStatus.COMPLETED) {
            return false;
        }
        return new Date() > new Date(this.deadline);
    }

    // For serialization
    toObject() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            userId: this.userId,
            startDate: this.startDate,
            deadline: this.deadline,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = { Task };
