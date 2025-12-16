-- ============================================
-- Task Manager System - Complete Database Setup
-- SQL Server 2019+ / Express
-- Clean Architecture - Infrastructure Layer
-- 
-- This script will:
-- 1. Drop existing database if it exists
-- 2. Create new database
-- 3. Create all tables with constraints
-- 4. Create triggers for automatic timestamp updates
-- 5. Create stored procedures
-- 6. Insert sample data for testing
-- 
-- Run this script in SSMS against the master database
-- ============================================

USE master;
GO

-- ============================================
-- Step 1: Drop existing database if exists
-- ============================================
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'TaskManager')
BEGIN
    ALTER DATABASE TaskManager SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE TaskManager;
    PRINT 'Database TaskManager dropped successfully.';
END
ELSE
BEGIN
    PRINT 'Database TaskManager does not exist. Creating new database...';
END
GO

-- ============================================
-- Step 2: Create new database
-- ============================================
CREATE DATABASE TaskManager;
GO

PRINT 'Database TaskManager created successfully.';
GO

-- Switch to the new database
USE TaskManager;
GO

-- ============================================
-- Step 3: Create Users Table
-- ============================================
CREATE TABLE dbo.Users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username NVARCHAR(50) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    password NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Unique constraints
    CONSTRAINT UQ_Users_Email UNIQUE (email),
    CONSTRAINT UQ_Users_Username UNIQUE (username)
);

-- Create indexes for performance
CREATE INDEX IX_Users_Email ON dbo.Users(email);
CREATE INDEX IX_Users_Username ON dbo.Users(username);

PRINT 'Users table created successfully.';
GO

-- ============================================
-- Step 4: Create Tasks Table
-- ============================================
CREATE TABLE dbo.Tasks (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date DATETIME2 NOT NULL DEFAULT GETUTCDATE(), -- Default to creation time
    deadline DATETIME2 NULL,        -- Optional, can be NULL
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Foreign key constraint with CASCADE delete
    CONSTRAINT FK_Tasks_Users FOREIGN KEY (user_id) 
        REFERENCES dbo.Users(id) ON DELETE CASCADE,
    
    -- Check constraint for valid status values
    CONSTRAINT CK_Tasks_Status CHECK (status IN ('SCHEDULED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'))
);

-- Create indexes for performance
CREATE INDEX IX_Tasks_UserId ON dbo.Tasks(user_id);
CREATE INDEX IX_Tasks_Status ON dbo.Tasks(status);
CREATE INDEX IX_Tasks_UserId_Status ON dbo.Tasks(user_id, status);
CREATE INDEX IX_Tasks_StartDate ON dbo.Tasks(start_date);
CREATE INDEX IX_Tasks_Deadline ON dbo.Tasks(deadline);

PRINT 'Tasks table created successfully.';
PRINT 'Columns: id, user_id, title, description, status, start_date, deadline, created_at, updated_at';
GO

-- ============================================
-- Step 5: Create Triggers for Auto-Update Timestamps
-- ============================================

-- Trigger for Users table
CREATE TRIGGER TR_Users_UpdateTimestamp
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Users
    SET updated_at = GETUTCDATE()
    FROM dbo.Users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO

PRINT 'Trigger TR_Users_UpdateTimestamp created successfully.';
GO

-- Trigger for Tasks table
CREATE TRIGGER TR_Tasks_UpdateTimestamp
ON dbo.Tasks
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.Tasks
    SET updated_at = GETUTCDATE()
    FROM dbo.Tasks t
    INNER JOIN inserted i ON t.id = i.id;
END;
GO

PRINT 'Trigger TR_Tasks_UpdateTimestamp created successfully.';
GO

-- ============================================
-- Step 6: Create Stored Procedures
-- ============================================

-- Stored procedure to get user task statistics
CREATE PROCEDURE SP_GetUserStatistics
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
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
    FROM dbo.Tasks
    WHERE user_id = @user_id;
END;
GO

PRINT 'Stored procedure SP_GetUserStatistics created successfully.';
GO

-- ============================================
-- Step 7: Insert Sample Data
-- ============================================

-- Sample Users (password: "password123" hashed with bcrypt)
DECLARE @user1_id UNIQUEIDENTIFIER = NEWID();
DECLARE @user2_id UNIQUEIDENTIFIER = NEWID();
DECLARE @user3_id UNIQUEIDENTIFIER = NEWID();
DECLARE @user4_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO dbo.Users (id, username, email, password, created_at, updated_at)
VALUES 
    (@user1_id, 'johndoe', 'john.doe@example.com', '$2b$10$rXQ3Qqz8b9K5gJZJ5aB5ZeG5YH5J5aB5ZeG5YH5J5aB5ZeG5YH5J5a', GETUTCDATE(), GETUTCDATE()),
    (@user2_id, 'janedoe', 'jane.doe@example.com', '$2b$10$rXQ3Qqz8b9K5gJZJ5aB5ZeG5YH5J5aB5ZeG5YH5J5aB5ZeG5YH5J5a', GETUTCDATE(), GETUTCDATE()),
    (@user3_id, 'testuser', 'test@example.com', '$2b$10$rXQ3Qqz8b9K5gJZJ5aB5ZeG5YH5J5aB5ZeG5YH5J5aB5ZeG5YH5J5a', GETUTCDATE(), GETUTCDATE()),
    (@user4_id, 'hayami', 'nqtuanp2005@gmail.com', '$2b$10$WijFod5JggJQQj5id519hOp95mKchdr.VSF8Lr/krypZXicHtoJTa', GETUTCDATE(), GETUTCDATE());

PRINT 'Sample users inserted successfully.';
PRINT 'User 1 ID: ' + CAST(@user1_id AS NVARCHAR(50));
PRINT 'User 2 ID: ' + CAST(@user2_id AS NVARCHAR(50));
PRINT 'User 3 ID: ' + CAST(@user3_id AS NVARCHAR(50));
GO

-- Get user IDs for tasks (since we can't use variables across GO statements)
DECLARE @user1_id UNIQUEIDENTIFIER = (SELECT id FROM dbo.Users WHERE username = 'johndoe');
DECLARE @user2_id UNIQUEIDENTIFIER = (SELECT id FROM dbo.Users WHERE username = 'janedoe');
DECLARE @user3_id UNIQUEIDENTIFIER = (SELECT id FROM dbo.Users WHERE username = 'testuser');

-- Sample Tasks for User 1 (johndoe) - with dates and ALL statuses
INSERT INTO dbo.Tasks (id, user_id, title, description, status, start_date, deadline, created_at, updated_at)
VALUES 
    -- COMPLETED tasks
    (NEWID(), @user1_id, 'Setup development environment', 'Install Node.js, SQL Server, and VS Code', 'COMPLETED', DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -8, GETUTCDATE()), DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -8, GETUTCDATE())),
    (NEWID(), @user1_id, 'Review Clean Architecture principles', 'Read documentation and understand layer separation', 'COMPLETED', DATEADD(day, -7, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -7, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE())),
    -- IN_PROGRESS task
    (NEWID(), @user1_id, 'Implement authentication module', 'Create register, login, and token verification use cases', 'IN_PROGRESS', DATEADD(day, -3, GETUTCDATE()), DATEADD(day, 2, GETUTCDATE()), DATEADD(day, -3, GETUTCDATE()), GETUTCDATE()),
    -- PENDING task
    (NEWID(), @user1_id, 'Write unit tests', 'Add tests for domain entities and use cases', 'PENDING', GETUTCDATE(), DATEADD(day, 5, GETUTCDATE()), GETUTCDATE(), GETUTCDATE()),
    -- SCHEDULED task (future start date)
    (NEWID(), @user1_id, 'Deploy to production', 'Setup Azure App Service and SQL Database', 'SCHEDULED', DATEADD(day, 3, GETUTCDATE()), DATEADD(day, 10, GETUTCDATE()), GETUTCDATE(), GETUTCDATE()),
    -- FAILED task (deadline passed, not completed)
    (NEWID(), @user1_id, 'Fix critical bug', 'Urgent bug fix required', 'FAILED', DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -2, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), GETUTCDATE()),
    -- CANCELLED task (soft deleted)
    (NEWID(), @user1_id, 'Old feature request', 'This was cancelled due to priority change', 'CANCELLED', DATEADD(day, -8, GETUTCDATE()), DATEADD(day, -1, GETUTCDATE()), DATEADD(day, -8, GETUTCDATE()), GETUTCDATE());

-- Sample Tasks for User 2 (janedoe) - with dates and various statuses
INSERT INTO dbo.Tasks (id, user_id, title, description, status, start_date, deadline, created_at, updated_at)
VALUES 
    -- COMPLETED tasks
    (NEWID(), @user2_id, 'Design database schema', 'Create ERD and define all tables', 'COMPLETED', DATEADD(day, -15, GETUTCDATE()), DATEADD(day, -12, GETUTCDATE()), DATEADD(day, -15, GETUTCDATE()), DATEADD(day, -12, GETUTCDATE())),
    (NEWID(), @user2_id, 'Implement task CRUD operations', 'Add create, read, update, delete functionality', 'COMPLETED', DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -7, GETUTCDATE()), DATEADD(day, -10, GETUTCDATE()), DATEADD(day, -7, GETUTCDATE())),
    -- IN_PROGRESS task
    (NEWID(), @user2_id, 'Build frontend dashboard', 'Create HTML, CSS, and JavaScript for UI', 'IN_PROGRESS', DATEADD(day, -5, GETUTCDATE()), DATEADD(day, 3, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), GETUTCDATE()),
    -- PENDING task
    (NEWID(), @user2_id, 'Add task statistics feature', 'Show completion rate and task counts', 'PENDING', GETUTCDATE(), DATEADD(day, 7, GETUTCDATE()), GETUTCDATE(), GETUTCDATE()),
    -- SCHEDULED task
    (NEWID(), @user2_id, 'Performance optimization', 'Optimize database queries', 'SCHEDULED', DATEADD(day, 5, GETUTCDATE()), DATEADD(day, 15, GETUTCDATE()), GETUTCDATE(), GETUTCDATE()),
    -- CANCELLED task
    (NEWID(), @user2_id, 'Deprecated feature', 'This feature was removed from requirements', 'CANCELLED', DATEADD(day, -12, GETUTCDATE()), DATEADD(day, -5, GETUTCDATE()), DATEADD(day, -12, GETUTCDATE()), GETUTCDATE());

-- Sample Tasks for User 3 (testuser) - with dates and all statuses
INSERT INTO dbo.Tasks (id, user_id, title, description, status, start_date, deadline, created_at, updated_at)
VALUES 
    -- COMPLETED task
    (NEWID(), @user3_id, 'Learn SQL Server', 'Complete online tutorial on T-SQL basics', 'COMPLETED', DATEADD(day, -20, GETUTCDATE()), DATEADD(day, -15, GETUTCDATE()), DATEADD(day, -20, GETUTCDATE()), DATEADD(day, -15, GETUTCDATE())),
    -- IN_PROGRESS task
    (NEWID(), @user3_id, 'Practice Clean Architecture', 'Build sample project following CA principles', 'IN_PROGRESS', DATEADD(day, -10, GETUTCDATE()), DATEADD(day, 5, GETUTCDATE()), DATEADD(day, -10, GETUTCDATE()), GETUTCDATE()),
    -- PENDING tasks
    (NEWID(), @user3_id, 'Buy groceries', 'Milk, eggs, bread, and vegetables', 'PENDING', GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), @user3_id, 'Exercise routine', 'Monday: Chest, Tuesday: Back, Wednesday: Legs', 'PENDING', GETUTCDATE(), NULL, GETUTCDATE(), GETUTCDATE()),
    -- SCHEDULED task (future start)
    (NEWID(), @user3_id, 'Read architecture book', 'Finish Clean Architecture by Robert C. Martin', 'SCHEDULED', DATEADD(day, 7, GETUTCDATE()), DATEADD(day, 30, GETUTCDATE()), GETUTCDATE(), GETUTCDATE()),
    -- FAILED task (missed deadline)
    (NEWID(), @user3_id, 'Complete online course', 'Deadline was yesterday', 'FAILED', DATEADD(day, -14, GETUTCDATE()), DATEADD(day, -1, GETUTCDATE()), DATEADD(day, -14, GETUTCDATE()), GETUTCDATE()),
    -- CANCELLED task
    (NEWID(), @user3_id, 'Attend conference', 'Conference was cancelled', 'CANCELLED', DATEADD(day, -30, GETUTCDATE()), DATEADD(day, 10, GETUTCDATE()), DATEADD(day, -30, GETUTCDATE()), GETUTCDATE());

PRINT 'Sample tasks inserted successfully.';
GO

-- ============================================
-- Step 8: Verification and Summary
-- ============================================

PRINT '';
PRINT '============================================';
PRINT 'DATABASE SETUP COMPLETED SUCCESSFULLY';
PRINT '============================================';
PRINT '';

-- Show table counts
PRINT 'Table Summary:';
SELECT 'Users' AS TableName, COUNT(*) AS RecordCount FROM dbo.Users
UNION ALL
SELECT 'Tasks' AS TableName, COUNT(*) AS RecordCount FROM dbo.Tasks;

PRINT '';
PRINT 'User Accounts (use these credentials for testing):';
PRINT '-------------------------------------------';
SELECT 
    username AS Username, 
    email AS Email,
    'password123' AS Password,
    id AS UserId
FROM dbo.Users
ORDER BY username;

PRINT '';
PRINT 'Task Statistics by User:';
PRINT '-------------------------------------------';
SELECT 
    u.username AS Username,
    COUNT(t.id) AS TotalTasks,
    SUM(CASE WHEN t.status = 'SCHEDULED' THEN 1 ELSE 0 END) AS Scheduled,
    SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END) AS Pending,
    SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS InProgress,
    SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) AS Completed,
    SUM(CASE WHEN t.status = 'FAILED' THEN 1 ELSE 0 END) AS Failed,
    SUM(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END) AS Cancelled,
    CAST(
        (SUM(CASE WHEN t.status = 'COMPLETED' THEN 1.0 ELSE 0 END) / 
        NULLIF(COUNT(t.id), 0)) * 100 
        AS DECIMAL(5,2)
    ) AS CompletionRate
FROM dbo.Users u
LEFT JOIN dbo.Tasks t ON u.id = t.user_id
GROUP BY u.username
ORDER BY u.username;

PRINT '';
PRINT '============================================';
PRINT 'Database Setup Instructions:';
PRINT '============================================';
PRINT '1. Database Name: TaskManager';
PRINT '2. Default credentials: All users have password "password123"';
PRINT '3. Test users: johndoe, janedoe, testuser';
PRINT '4. Connection string example:';
PRINT '   Server=localhost;Database=TaskManager;User Id=sa;Password=YourPassword;';
PRINT '';
PRINT '============================================';
PRINT 'Next Steps:';
PRINT '============================================';
PRINT '1. Update .env file with database connection details';
PRINT '2. Run: npm install';
PRINT '3. Run: npm run dev';
PRINT '4. Navigate to: http://localhost:3000';
PRINT '5. Login with: john.doe@example.com / password123';
PRINT '';
PRINT '============================================';
PRINT 'SETUP COMPLETE - Ready to use!';
PRINT '============================================';
PRINT '';
PRINT 'Database Schema:';
PRINT '- Users: id, username, email, password, created_at, updated_at';
PRINT '- Tasks: id, user_id, title, description, status, start_date, deadline, created_at, updated_at';
PRINT '';
PRINT 'Date columns in Tasks table:';
PRINT '- start_date: DATETIME2 NOT NULL (required by application)';
PRINT '- deadline: DATETIME2 NULL (optional - can be NULL)';
GO

-- ============================================
-- MIGRATION: Add date columns if not exist
-- (For existing databases that don't have these columns)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'start_date')
BEGIN
    PRINT '';
    PRINT 'Adding start_date column to existing Tasks table...';
    ALTER TABLE dbo.Tasks ADD start_date DATETIME2 NOT NULL DEFAULT GETUTCDATE();
    CREATE INDEX IX_Tasks_StartDate ON dbo.Tasks(start_date);
    PRINT 'start_date column added successfully.';
END
ELSE
BEGIN
    PRINT 'start_date column already exists.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Tasks') AND name = 'deadline')
BEGIN
    PRINT '';
    PRINT 'Adding deadline column to existing Tasks table...';
    ALTER TABLE dbo.Tasks ADD deadline DATETIME2 NULL;
    CREATE INDEX IX_Tasks_Deadline ON dbo.Tasks(deadline);
    PRINT 'deadline column added successfully.';
END
ELSE
BEGIN
    PRINT 'deadline column already exists.';
END
GO

PRINT '';
PRINT 'Date columns migration complete!';
GO