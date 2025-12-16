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
        
        // startDate is required - if not provided or invalid, use current datetime
        let effectiveStartDate = new Date();
        if (startDate) {
            const tempDate = new Date(startDate);
            if (!isNaN(tempDate.getTime())) {
                effectiveStartDate = tempDate;
            }
        }
        
        // Validate deadline if provided
        if (deadline) {
            this.validateDeadline(deadline, effectiveStartDate);
        }
        
        this.id = null; // Will be set by repository
        this.title = title.trim();
        this.description = description ? description.trim() : '';
        
        // Business logic: Determine initial status based on startDate
        const now = new Date();
        if (effectiveStartDate > now) {
            this.status = TaskStatus.SCHEDULED; // Future task
        } else {
            this.status = TaskStatus.PENDING; // Current or past task
        }
        
        this.userId = userId;
        this.startDate = effectiveStartDate;
        this.deadline = deadline; // Can be null
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
        
        // Business rule: Cannot manually set to FAILED (auto-assigned only)
        if (newStatus === TaskStatus.FAILED && this.status !== TaskStatus.FAILED) {
            throw DomainException.businessRuleViolation(
                'Cannot manually set task to FAILED status. It is auto-assigned when deadline passes.'
            );
        }
        
        // Business rule: FAILED task can be completed (late completion allowed)
        // Business rule: Cannot manually set to CANCELLED (use delete/cancel method)
        if (newStatus === TaskStatus.CANCELLED) {
            throw DomainException.businessRuleViolation(
                'Cannot manually set task to CANCELLED. Use cancelTask() method instead.'
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
        // Compare timestamps, not Date objects
        if (this.deadline) {
            const deadlineTime = new Date(this.deadline).getTime();
            if (start.getTime() > deadlineTime) {
                throw DomainException.validationError('Start date cannot be after deadline');
            }
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
        // Business rule: Can complete from any status (including FAILED)
        // FAILED tasks can be marked complete if user finishes later
        this.status = TaskStatus.COMPLETED;
        this.updatedAt = new Date();
    }

    markAsFailed() {
        // Business rule: Can only mark as failed if not already completed or failed
        if (this.status === TaskStatus.COMPLETED) {
            return; // Already completed, do nothing
        }
        if (this.status === TaskStatus.FAILED) {
            return; // Already failed, do nothing
        }
        this.status = TaskStatus.FAILED;
        this.updatedAt = new Date();
    }

    reopen() {
        if (this.status === TaskStatus.COMPLETED) {
            this.status = TaskStatus.IN_PROGRESS;
        } else if (this.status === TaskStatus.FAILED) {
            // Cannot reopen failed tasks
            throw DomainException.businessRuleViolation(
                'Cannot reopen a failed task. Create a new task instead.'
            );
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

    isFailed() {
        return this.status === TaskStatus.FAILED;
    }

    isScheduled() {
        return this.status === TaskStatus.SCHEDULED;
    }

    isCancelled() {
        return this.status === TaskStatus.CANCELLED;
    }

    // Business method: Check if task should be auto-marked as failed
    shouldBeMarkedAsFailed() {
        // Only mark as failed if:
        // 1. Has a deadline
        // 2. Not already completed, failed, or cancelled
        // 3. Deadline has passed
        if (!this.deadline) return false;
        if (this.status === TaskStatus.COMPLETED) return false;
        if (this.status === TaskStatus.FAILED) return false;
        if (this.status === TaskStatus.CANCELLED) return false;
        return new Date() > new Date(this.deadline);
    }

    // Business method: Check if task should transition from SCHEDULED to PENDING
    shouldTransitionToPending() {
        if (this.status !== TaskStatus.SCHEDULED) return false;
        const now = new Date();
        return new Date(this.startDate) <= now;
    }

    // Business method: Cancel/delete task (soft delete)
    cancelTask() {
        if (this.status === TaskStatus.CANCELLED) {
            return; // Already cancelled
        }
        this.status = TaskStatus.CANCELLED;
        this.updatedAt = new Date();
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
