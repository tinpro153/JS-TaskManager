const sql = require('mssql');

/**
 * SQL Server User Table Queries
 * Infrastructure layer - Framework-specific implementation
 */
class UserModel {
    /**
     * User table structure:
     * - id: UNIQUEIDENTIFIER (Primary Key)
     * - username: NVARCHAR(50) (Unique)
     * - email: NVARCHAR(255) (Unique)
     * - password: NVARCHAR(255)
     * - created_at: DATETIME2
     * - updated_at: DATETIME2
     */

    static TABLE_NAME = 'Users';

    /**
     * Create a new user
     */
    static async create(pool, { username, email, password }) {
        const request = pool.request();
        const result = await request
            .input('username', sql.NVarChar(50), username)
            .input('email', sql.NVarChar(255), email.toLowerCase())
            .input('password', sql.NVarChar(255), password)
            .query(`
                INSERT INTO ${this.TABLE_NAME} (username, email, password)
                OUTPUT INSERTED.*
                VALUES (@username, @email, @password)
            `);
        return result.recordset[0];
    }

    /**
     * Find user by ID
     */
    static async findById(pool, id) {
        const request = pool.request();
        const result = await request
            .input('id', sql.UniqueIdentifier, id)
            .query(`SELECT * FROM ${this.TABLE_NAME} WHERE id = @id`);
        return result.recordset[0] || null;
    }

    /**
     * Find user by email
     */
    static async findByEmail(pool, email) {
        const request = pool.request();
        const result = await request
            .input('email', sql.NVarChar(255), email.toLowerCase())
            .query(`SELECT * FROM ${this.TABLE_NAME} WHERE email = @email`);
        return result.recordset[0] || null;
    }

    /**
     * Find user by username
     */
    static async findByUsername(pool, username) {
        const request = pool.request();
        const result = await request
            .input('username', sql.NVarChar(50), username)
            .query(`SELECT * FROM ${this.TABLE_NAME} WHERE username = @username`);
        return result.recordset[0] || null;
    }

    /**
     * Check if email exists
     */
    static async existsByEmail(pool, email) {
        const request = pool.request();
        const result = await request
            .input('email', sql.NVarChar(255), email.toLowerCase())
            .query(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE email = @email`);
        return result.recordset[0].count > 0;
    }

    /**
     * Check if username exists
     */
    static async existsByUsername(pool, username) {
        const request = pool.request();
        const result = await request
            .input('username', sql.NVarChar(50), username)
            .query(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE username = @username`);
        return result.recordset[0].count > 0;
    }

    /**
     * Update user
     */
    static async update(pool, id, { username, email }) {
        const request = pool.request();
        // UPDATE without OUTPUT due to trigger conflict
        await request
            .input('id', sql.UniqueIdentifier, id)
            .input('username', sql.NVarChar(50), username)
            .input('email', sql.NVarChar(255), email)
            .query(`
                UPDATE ${this.TABLE_NAME}
                SET username = @username, email = @email
                WHERE id = @id
            `);
        
        // Fetch updated record
        return await this.findById(pool, id);
    }

    /**
     * Update password
     */
    static async updatePassword(pool, id, hashedPassword) {
        const request = pool.request();
        // UPDATE without OUTPUT due to trigger conflict
        await request
            .input('id', sql.UniqueIdentifier, id)
            .input('password', sql.NVarChar(255), hashedPassword)
            .query(`
                UPDATE ${this.TABLE_NAME}
                SET password = @password
                WHERE id = @id
            `);
        
        // Fetch updated record
        return await this.findById(pool, id);
    }

    /**
     * Delete user
     */
    static async delete(pool, id) {
        const request = pool.request();
        await request
            .input('id', sql.UniqueIdentifier, id)
            .query(`DELETE FROM ${this.TABLE_NAME} WHERE id = @id`);
    }
}

module.exports = { UserModel };
