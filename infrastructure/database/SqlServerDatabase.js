const sql = require('mssql');

/**
 * SQL Server Connection Handler
 * Infrastructure layer
 */
class SqlServerDatabase {
    constructor() {
        this.pool = null;
        this.config = null;
    }

    /**
     * Connect to SQL Server
     * @param {Object} config - Connection configuration
     * @param {string} config.user - Database user
     * @param {string} config.password - Database password
     * @param {string} config.server - Server address
     * @param {string} config.database - Database name
     * @param {number} config.port - Port (default: 1433)
     * @param {Object} config.options - Additional options
     */
    async connect(config) {
        try {
            this.config = {
                user: config.user,
                password: config.password,
                server: config.server,
                database: config.database,
                port: config.port || 1433,
                options: {
                    encrypt: config.options?.encrypt !== false, // Default to true for Azure
                    trustServerCertificate: config.options?.trustServerCertificate !== false, // For local dev
                    enableArithAbort: true,
                    ...config.options
                },
                connectionTimeout: config.connectionTimeout || 30000,
                requestTimeout: config.requestTimeout || 30000,
                pool: {
                    max: config.pool?.max || 10,
                    min: config.pool?.min || 0,
                    idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000
                }
            };

            this.pool = await sql.connect(this.config);
            console.log('✅ SQL Server connected successfully');
            console.log(`   Database: ${config.database}`);
            console.log(`   Server: ${config.server}`);
            return this.pool;
        } catch (error) {
            console.error('❌ SQL Server connection error:', error.message);
            throw error;
        }
    }

    /**
     * Disconnect from SQL Server
     */
    async disconnect() {
        if (this.pool) {
            await this.pool.close();
            console.log('SQL Server disconnected');
            this.pool = null;
        }
    }

    /**
     * Get connection status
     */
    isConnected() {
        return this.pool && this.pool.connected;
    }

    /**
     * Get connection pool
     */
    getPool() {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.pool;
    }

    /**
     * Execute raw query
     */
    async query(queryString, params = {}) {
        const request = this.getPool().request();
        
        // Add parameters
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
        });

        const result = await request.query(queryString);
        return result;
    }

    /**
     * Execute stored procedure
     */
    async executeProcedure(procedureName, params = {}) {
        const request = this.getPool().request();
        
        // Add parameters
        Object.entries(params).forEach(([key, value]) => {
            request.input(key, value);
        });

        const result = await request.execute(procedureName);
        return result;
    }

    /**
     * Begin transaction
     */
    async beginTransaction() {
        const transaction = new sql.Transaction(this.getPool());
        await transaction.begin();
        return transaction;
    }
}

module.exports = { SqlServerDatabase };
