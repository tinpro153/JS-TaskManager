const { TaskStatus } = require('../../domain/valueobjects/TaskStatus');

describe('TaskStatus Value Object', () => {
    describe('Constants', () => {
        it('should have PENDING status', () => {
            expect(TaskStatus.PENDING).toBe('PENDING');
        });

        it('should have IN_PROGRESS status', () => {
            expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
        });

        it('should have COMPLETED status', () => {
            expect(TaskStatus.COMPLETED).toBe('COMPLETED');
        });
    });

    describe('getAllStatuses', () => {
        it('should return all status values', () => {
            const statuses = TaskStatus.getAllStatuses();
            
            expect(statuses).toHaveLength(3);
            expect(statuses).toContain('PENDING');
            expect(statuses).toContain('IN_PROGRESS');
            expect(statuses).toContain('COMPLETED');
        });
    });

    describe('isValid', () => {
        it('should validate Pending', () => {
            expect(TaskStatus.isValid('PENDING')).toBe(true);
        });

        it('should validate In Progress', () => {
            expect(TaskStatus.isValid('IN_PROGRESS')).toBe(true);
        });

        it('should validate Completed', () => {
            expect(TaskStatus.isValid('COMPLETED')).toBe(true);
        });

        it('should reject invalid status', () => {
            expect(TaskStatus.isValid('InvalidStatus')).toBe(false);
        });

        it('should reject null', () => {
            expect(TaskStatus.isValid(null)).toBe(false);
        });

        it('should reject undefined', () => {
            expect(TaskStatus.isValid(undefined)).toBe(false);
        });
    });

    describe('fromString', () => {
        it('should convert valid string to status', () => {
            expect(TaskStatus.fromString('Pending')).toBe('PENDING');
            expect(TaskStatus.fromString('In Progress')).toBe('IN_PROGRESS');
            expect(TaskStatus.fromString('Completed')).toBe('COMPLETED');
        });

        it('should handle case-insensitive input', () => {
            expect(TaskStatus.fromString('pending')).toBe('PENDING');
            expect(TaskStatus.fromString('in progress')).toBe('IN_PROGRESS');
            expect(TaskStatus.fromString('COMPLETED')).toBe('COMPLETED');
        });

        it('should default to PENDING for null', () => {
            expect(TaskStatus.fromString(null)).toBe('PENDING');
        });

        it('should default to PENDING for undefined', () => {
            expect(TaskStatus.fromString(undefined)).toBe('PENDING');
        });

        it('should default to PENDING for empty string', () => {
            expect(TaskStatus.fromString('')).toBe('PENDING');
        });

        it('should throw error for invalid status', () => {
            expect(() => {
                TaskStatus.fromString('InvalidStatus');
            }).toThrow('Invalid task status: InvalidStatus');
        });
    });
});
