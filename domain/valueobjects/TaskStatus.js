/**
 * TaskStatus Value Object - Immutable status enumeration
 * Represents the lifecycle states of a task
 */
class TaskStatus {
    static PENDING = 'PENDING';
    static IN_PROGRESS = 'IN_PROGRESS';
    static COMPLETED = 'COMPLETED';

    static getAllStatuses() {
        return [this.PENDING, this.IN_PROGRESS, this.COMPLETED];
    }

    static isValid(status) {
        return this.getAllStatuses().includes(status);
    }

    static fromString(status) {
        if (!status) {
            return this.PENDING;
        }
        
        const normalized = status.trim();
        if (this.isValid(normalized)) {
            return normalized;
        }
        
        // Try case-insensitive match
        const found = this.getAllStatuses().find(
            s => s.toLowerCase() === normalized.toLowerCase()
        );
        
        if (found) {
            return found;
        }
        
        // Convert from old format with spaces to new format
        // "In Progress" -> "IN_PROGRESS", "Pending" -> "PENDING"
        const withUnderscores = normalized.toUpperCase().replace(/\s+/g, '_');
        if (this.isValid(withUnderscores)) {
            return withUnderscores;
        }
        
        throw new Error(`Invalid task status: ${status}`);
    }
}

module.exports = { TaskStatus };
