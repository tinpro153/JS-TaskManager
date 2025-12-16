const { Task } = require('../../domain/entities/Task');
const { TaskStatus } = require('../../domain/valueobjects/TaskStatus');
const { DomainException } = require('../../domain/exceptions/DomainException');

describe('Task Entity', () => {
    describe('Constructor', () => {
        it('should create a valid task', () => {
            const task = new Task('Buy groceries', 'Milk, eggs, bread', 'user123');
            
            expect(task.getTitle()).toBe('Buy groceries');
            expect(task.getDescription()).toBe('Milk, eggs, bread');
            expect(task.getStatus()).toBe(TaskStatus.PENDING);
            expect(task.getUserId()).toBe('user123');
            expect(task.getId()).toBeNull();
            expect(task.getCreatedAt()).toBeInstanceOf(Date);
            expect(task.getUpdatedAt()).toBeInstanceOf(Date);
        });

        it('should trim title and description', () => {
            const task = new Task('  Title with spaces  ', '  Description  ', 'user123');
            
            expect(task.getTitle()).toBe('Title with spaces');
            expect(task.getDescription()).toBe('Description');
        });

        it('should allow empty description', () => {
            const task = new Task('Task title', '', 'user123');
            expect(task.getDescription()).toBe('');
        });

        it('should allow null description', () => {
            const task = new Task('Task title', null, 'user123');
            expect(task.getDescription()).toBe('');
        });

        it('should throw error for missing title', () => {
            expect(() => {
                new Task('', 'Description', 'user123');
            }).toThrow('Task title is required');
        });

        it('should throw error for title too long', () => {
            const longTitle = 'a'.repeat(201);
            expect(() => {
                new Task(longTitle, 'Description', 'user123');
            }).toThrow('Task title must not exceed 200 characters');
        });

        it('should throw error for missing userId', () => {
            expect(() => {
                new Task('Title', 'Description', '');
            }).toThrow('User ID is required for task');
        });
    });

    describe('reconstruct', () => {
        it('should reconstruct task from database data', () => {
            const startDate = new Date('2024-12-01');
            const deadline = new Date('2025-01-15');
            const createdAt = new Date('2025-01-01');
            const updatedAt = new Date('2025-01-02');
            
            const task = Task.reconstruct(
                'task123',
                'Buy groceries',
                'Milk, eggs',
                TaskStatus.IN_PROGRESS,
                'user123',
                startDate,
                deadline,
                createdAt,
                updatedAt
            );

            expect(task.getId()).toBe('task123');
            expect(task.getTitle()).toBe('Buy groceries');
            expect(task.getDescription()).toBe('Milk, eggs');
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
            expect(task.getUserId()).toBe('user123');
            expect(task.getStartDate()).toBe(startDate);
            expect(task.getDeadline()).toBe(deadline);
            expect(task.getCreatedAt()).toBe(createdAt);
            expect(task.getUpdatedAt()).toBe(updatedAt);
        });
    });

    describe('updateTitle', () => {
        it('should update title', () => {
            const task = new Task('Old title', 'Description', 'user123');
            task.updateTitle('New title');
            
            expect(task.getTitle()).toBe('New title');
        });

        it('should validate new title', () => {
            const task = new Task('Title', 'Description', 'user123');
            
            expect(() => {
                task.updateTitle('');
            }).toThrow('Task title is required');
        });
    });

    describe('updateDescription', () => {
        it('should update description', () => {
            const task = new Task('Title', 'Old description', 'user123');
            task.updateDescription('New description');
            
            expect(task.getDescription()).toBe('New description');
        });

        it('should allow empty description', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.updateDescription('');
            
            expect(task.getDescription()).toBe('');
        });
    });

    describe('updateStatus', () => {
        it('should update status to In Progress', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.updateStatus(TaskStatus.IN_PROGRESS);
            
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
        });

        it('should update status to Completed', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.updateStatus(TaskStatus.COMPLETED);
            
            expect(task.getStatus()).toBe(TaskStatus.COMPLETED);
        });

        it('should throw error for invalid status', () => {
            const task = new Task('Title', 'Description', 'user123');
            
            expect(() => {
                task.updateStatus('InvalidStatus');
            }).toThrow('Invalid task status');
        });

        it('should not allow Completed -> Pending transition', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.COMPLETED, 'user123', new Date(), new Date());
            
            expect(() => {
                task.updateStatus(TaskStatus.PENDING);
            }).toThrow('Cannot change completed task back to pending');
        });

        it('should allow Completed -> In Progress transition', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.COMPLETED, 'user123', new Date(), new Date());
            task.updateStatus(TaskStatus.IN_PROGRESS);
            
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
        });
    });

    describe('update', () => {
        it('should update all fields', () => {
            const task = new Task('Old title', 'Old description', 'user123');
            task.update('New title', 'New description', TaskStatus.IN_PROGRESS);
            
            expect(task.getTitle()).toBe('New title');
            expect(task.getDescription()).toBe('New description');
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
        });

        it('should update only title', () => {
            const task = new Task('Old title', 'Description', 'user123');
            task.update('New title', undefined, undefined);
            
            expect(task.getTitle()).toBe('New title');
            expect(task.getDescription()).toBe('Description');
            expect(task.getStatus()).toBe(TaskStatus.PENDING);
        });
    });

    describe('markAsInProgress', () => {
        it('should mark pending task as in progress', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.markAsInProgress();
            
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
        });

        it('should throw error when marking completed task as in progress', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.COMPLETED, 'user123', new Date(), new Date());
            
            expect(() => {
                task.markAsInProgress();
            }).toThrow('Cannot restart a completed task');
        });
    });

    describe('markAsCompleted', () => {
        it('should mark task as completed', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.markAsCompleted();
            
            expect(task.getStatus()).toBe(TaskStatus.COMPLETED);
        });
    });

    describe('reopen', () => {
        it('should reopen completed task to in progress', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.COMPLETED, 'user123', new Date(), new Date());
            task.reopen();
            
            expect(task.getStatus()).toBe(TaskStatus.IN_PROGRESS);
        });

        it('should reopen in progress task to pending', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.IN_PROGRESS, 'user123', new Date(), new Date());
            task.reopen();
            
            expect(task.getStatus()).toBe(TaskStatus.PENDING);
        });
    });

    describe('belongsToUser', () => {
        it('should return true for owner', () => {
            const task = new Task('Title', 'Description', 'user123');
            expect(task.belongsToUser('user123')).toBe(true);
        });

        it('should return false for non-owner', () => {
            const task = new Task('Title', 'Description', 'user123');
            expect(task.belongsToUser('user456')).toBe(false);
        });
    });

    describe('Status checks', () => {
        it('should check isPending', () => {
            const task = new Task('Title', 'Description', 'user123');
            expect(task.isPending()).toBe(true);
            expect(task.isInProgress()).toBe(false);
            expect(task.isCompleted()).toBe(false);
        });

        it('should check isInProgress', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.IN_PROGRESS, 'user123', new Date(), new Date());
            expect(task.isPending()).toBe(false);
            expect(task.isInProgress()).toBe(true);
            expect(task.isCompleted()).toBe(false);
        });

        it('should check isCompleted', () => {
            const task = Task.reconstruct('task123', 'Title', 'Desc', TaskStatus.COMPLETED, 'user123', new Date(), new Date());
            expect(task.isPending()).toBe(false);
            expect(task.isInProgress()).toBe(false);
            expect(task.isCompleted()).toBe(true);
        });
    });

    describe('toObject', () => {
        it('should return complete task object', () => {
            const task = new Task('Title', 'Description', 'user123');
            task.id = 'task123';
            
            const obj = task.toObject();
            
            expect(obj).toHaveProperty('id');
            expect(obj).toHaveProperty('title');
            expect(obj).toHaveProperty('description');
            expect(obj).toHaveProperty('status');
            expect(obj).toHaveProperty('userId');
            expect(obj).toHaveProperty('createdAt');
            expect(obj).toHaveProperty('updatedAt');
        });
    });
});
