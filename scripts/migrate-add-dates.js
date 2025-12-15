/**
 * Migration Script: Add start_date and deadline columns to Tasks table
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function migrate() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        
        console.log('Checking if columns already exist...');
        const checkColumns = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Tasks' 
            AND COLUMN_NAME IN ('start_date', 'deadline')
        `);
        
        if (checkColumns.recordset[0].count > 0) {
            console.log('Columns already exist, skipping migration.');
            return;
        }
        
        console.log('Adding start_date and deadline columns...');
        await pool.request().query(`
            ALTER TABLE Tasks 
            ADD start_date DATETIME2 DEFAULT GETDATE() NOT NULL,
                deadline DATETIME2 NULL
        `);
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

migrate();
