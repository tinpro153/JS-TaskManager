const { UserRepository } = require('../../business/ports/UserRepository');
const { User } = require('../../domain/entities/User');
const { UserModel } = require('../../infrastructure/database/models/UserModel');

/**
 * SQL Server User Repository Adapter
 * Implements UserRepository interface from Business layer
 * Translates between Domain entities and SQL Server records
 */
class SqlUserRepository extends UserRepository {
    constructor(database) {
        super();
        this.database = database;
    }

    /**
     * Get SQL Server connection pool
     */
    getPool() {
        return this.database.getPool();
    }

    /**
     * Save a new user
     */
    async save(user) {
        const pool = this.getPool();
        const savedRow = await UserModel.create(pool, {
            username: user.getUsername(),
            email: user.getEmail(),
            password: user.getPassword()
        });
        return this.toDomain(savedRow);
    }

    /**
     * Find user by ID
     */
    async findById(userId) {
        const pool = this.getPool();
        const row = await UserModel.findById(pool, userId);
        return row ? this.toDomain(row) : null;
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const pool = this.getPool();
        const row = await UserModel.findByEmail(pool, email);
        return row ? this.toDomain(row) : null;
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        const pool = this.getPool();
        const row = await UserModel.findByUsername(pool, username);
        return row ? this.toDomain(row) : null;
    }

    /**
     * Update existing user
     */
    async update(user) {
        const pool = this.getPool();
        const updatedRow = await UserModel.update(pool, user.getId(), {
            username: user.getUsername(),
            email: user.getEmail()
        });

        if (!updatedRow) {
            throw new Error(`User with ID ${user.getId()} not found`);
        }

        // Update password if changed
        if (user.getPassword()) {
            await UserModel.updatePassword(pool, user.getId(), user.getPassword());
        }

        return this.toDomain(updatedRow);
    }

    /**
     * Delete user by ID
     */
    async delete(userId) {
        const pool = this.getPool();
        await UserModel.delete(pool, userId);
        return true;
    }

    /**
     * Check if email already exists
     */
    async existsByEmail(email) {
        const pool = this.getPool();
        return await UserModel.existsByEmail(pool, email);
    }

    /**
     * Check if username already exists
     */
    async existsByUsername(username) {
        const pool = this.getPool();
        return await UserModel.existsByUsername(pool, username);
    }

    /**
     * Convert SQL Server row to Domain entity
     */
    toDomain(row) {
        return User.reconstruct(
            row.id.toLowerCase(), // Convert GUID to lowercase string
            row.username,
            row.email,
            row.password,
            row.created_at,
            row.updated_at
        );
    }
}

module.exports = { SqlUserRepository };
