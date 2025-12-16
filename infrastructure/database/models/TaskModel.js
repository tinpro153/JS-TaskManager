const sql = require('mssql');

/**
 * SQL Server Task Table Queries
 * Infrastructure layer - Framework-specific implementation
 */
class TaskModel {
    /**
     * Task table structure:
     * - id: UNIQUEIDENTIFIER (Primary Key)
     * - user_id: UNIQUEIDENTIFIER (Foreign Key to Users)
     * - title: NVARCHAR(200)
     * - description: NVARCHAR(1000)
     * - status: NVARCHAR(20) (SCHEDULED, PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
     * - start_date: DATETIME2
     * - deadline: DATETIME2
     * - created_at: DATETIME2
     * - updated_at: DATETIME2
     */

    static TABLE_NAME = 'Tasks';

    /**
     * Create a new task
     */
    static async create(pool, { user_id, title, description, status = 'PENDING', start_date, deadline }) {
        const request = pool.request();
        
        // Validate and fallback for start_date
        let effectiveStartDate = start_date;
        if (!start_date || !(start_date instanceof Date) || isNaN(start_date.getTime())) {
            effectiveStartDate = new Date();
        }
        
        // Validate deadline if provided
        let effectiveDeadline = null;
        if (deadline && deadline instanceof Date && !isNaN(deadline.getTime())) {
            effectiveDeadline = deadline;
        }
        
        const result = await request
            .input('user_id', sql.UniqueIdentifier, user_id)
            .input('title', sql.NVarChar(200), title)
            .input('description', sql.NVarChar(1000), description || '')
            .input('status', sql.NVarChar(20), status)
            .input('start_date', sql.DateTime2, effectiveStartDate)
            .input('deadline', sql.DateTime2, effectiveDeadline)
            .query(`
                INSERT INTO ${this.TABLE_NAME} (user_id, title, description, status, start_date, deadline)
                OUTPUT INSERTED.*
                VALUES (@user_id, @title, @description, @status, @start_date, @deadline)
            `);
        return result.recordset[0];
    }

    /**
     * Find task by ID
     */
    static async findById(pool, id) {
        const request = pool.request();
        const result = await request
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT * FROM ${this.TABLE_NAME} WHERE id = @id`);
        return result.recordset[0] || null;
    }

    /**
     * Find tasks by user ID
     */
    static async findByUserId(pool, userId) {
        const request = pool.request();
        const result = await request
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT * FROM ${this.TABLE_NAME} 
                WHERE user_id = @userId 
                ORDER BY created_at DESC
            `);
        return result.recordset;
    }

    /**
     * Find tasks by user ID and status
     */
    static async findByUserIdAndStatus(pool, userId, status) {
        const request = pool.request();
        const result = await request
            .input('userId', sql.UniqueIdentifier, userId)
            .input('status', sql.NVarChar(20), status)
            .query(`
                SELECT * FROM ${this.TABLE_NAME} 
                WHERE user_id = @userId AND status = @status
                ORDER BY created_at DESC
            `);
        return result.recordset;
    }

    /**
     * Update task
     */
    static async update(pool, id, { title, description, start_date, deadline }) {
        const request = pool.request();
        
        // Build dynamic update query
        let query = `UPDATE ${this.TABLE_NAME} SET `;
        const updates = [];
        
        if (title !== undefined) {
            request.input('title', sql.NVarChar(200), title);
            updates.push('title = @title');
        }
        if (description !== undefined) {
            request.input('description', sql.NVarChar(1000), description || '');
            updates.push('description = @description');
        }
        if (start_date !== undefined) {
            request.input('start_date', sql.DateTime2, start_date);
            updates.push('start_date = @start_date');
        }
        if (deadline !== undefined) {
            request.input('deadline', sql.DateTime2, deadline);
            updates.push('deadline = @deadline');
        }
        
        if (updates.length === 0) {
            return await this.findById(pool, id);
        }
        
        query += updates.join(', ') + ' WHERE id = @id';
        
        // UPDATE without OUTPUT due to trigger conflict
        request.input('id', sql.UniqueIdentifier, id);
        await request.query(query);
        
        // Fetch updated record
        return await this.findById(pool, id);
    }

    /**
     * Update task status
     */
    static async updateStatus(pool, id, status) {
        const request = pool.request();
        // UPDATE without OUTPUT due to trigger conflict
        await request
            .input('id', sql.UniqueIdentifier, id)
            .input('status', sql.NVarChar(20), status)
            .query(`
                UPDATE ${this.TABLE_NAME}
                SET status = @status
                WHERE id = @id
            `);
        
        // Fetch updated record
        return await this.findById(pool, id);
    }

    /**
     * Delete task
     */
    static async delete(pool, id) {
        const request = pool.request();
        await request
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM ${this.TABLE_NAME} WHERE id = @id`);
    }

    /**
     * Delete all tasks by user ID
     */
    static async deleteByUserId(pool, userId) {
        const request = pool.request();
        await request
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`DELETE FROM ${this.TABLE_NAME} WHERE user_id = @userId`);
    }

    /**
     * Count tasks by user ID and status
     */
    static async countByUserIdAndStatus(pool, userId, status) {
        const request = pool.request();
        const result = await request
            .input('userId', sql.UniqueIdentifier, userId)
            .input('status', sql.NVarChar(20), status)
            .query(`
                SELECT COUNT(*) as count FROM ${this.TABLE_NAME} 
                WHERE user_id = @userId AND status = @status
            `);
        return result.recordset[0].count;
    }

    /**
     * Get statistics for user
     */
    static async getStatistics(pool, userId) {
        const request = pool.request();
        const result = await request
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                    CAST(
                        (SUM(CASE WHEN status = 'COMPLETED' THEN 1.0 ELSE 0 END) / 
                        NULLIF(COUNT(*), 0)) * 100 
                        AS DECIMAL(5,2)
                    ) as completion_rate
                FROM ${this.TABLE_NAME}
                WHERE user_id = @userId
            `);
        return result.recordset[0];
    }
}

module.exports = { TaskModel };
