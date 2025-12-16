/**
 * Integration Tests for Task API Endpoints
 * Tests E2E flow: HTTP → Controller → Use Case → Repository → Database
 * 
 * Following knowledge.txt best practices:
 * - RESTful API conventions (GET, POST, PUT, PATCH, DELETE)
 * - Authentication (JWT)
 * - Status codes (200, 201, 400, 401, 404, 500)
 * - Response format: { success, data, message }
 */

const request = require('supertest');
const { App } = require('../../app');
const { Config } = require('../../infrastructure/config/Config');

describe('Task API Integration Tests', () => {
    let app;
    let appInstance;
    let authToken;
    let testUserId;
    let createdTaskId;

    // Setup before all tests
    beforeAll(async () => {
        // Initialize Express app
        appInstance = new App();
        await appInstance.initialize();
        app = appInstance.getApp();

        // Register test user
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser_integration',
                email: 'testuser_integration@test.com',
                password: 'TestPassword123!'
            });

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'testuser_integration@test.com',
                password: 'TestPassword123!'
            });

        authToken = loginResponse.body.token;
        testUserId = loginResponse.body.user.id;

        console.log('✅ Test setup complete - User registered and logged in with token');
    });

    // Cleanup after all tests
    afterAll(async () => {
        // Clean up test data
        if (createdTaskId && authToken) {
            try {
                await request(app)
                    .delete(`/api/tasks/${createdTaskId}`)
                    .set('Authorization', `Bearer ${authToken}`);
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        // Stop server and close connections
        await appInstance.stop();
        console.log('✅ Test cleanup complete');
    });

    // =================================================================
    // AUTHENTICATION TESTS
    // =================================================================

    describe('POST /api/tasks - Authentication', () => {
        test('should return 401 when no token provided', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .send({
                    title: 'Test Task',
                    description: 'Test Description'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('should return 401 when invalid token provided', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', 'Bearer invalid_token')
                .send({
                    title: 'Test Task',
                    description: 'Test Description'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // CREATE TASK TESTS (POST /api/tasks)
    // =================================================================

    describe('POST /api/tasks - Create Task', () => {
        test('should create task successfully with all fields', async () => {
            const startDate = new Date().toISOString();
            const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Integration Test Task',
                    description: 'Task created during integration testing',
                    startDate: startDate,
                    deadline: deadline
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.task).toHaveProperty('id');
            expect(response.body.task.title).toBe('Integration Test Task');
            expect(response.body.task.status).toBe('PENDING');
            expect(response.body.task).toHaveProperty('startDate');
            expect(response.body.task).toHaveProperty('deadline');

            // Store for later tests
            createdTaskId = response.body.task.id;
        });

        test('should create task with only required fields (title, description)', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Minimal Task',
                    description: 'Task with only required fields'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.task.title).toBe('Minimal Task');
            expect(response.body.task).toHaveProperty('startDate'); // Should have default startDate

            // Cleanup
            await request(app)
                .delete(`/api/tasks/${response.body.task.id}`)
                .set('Authorization', `Bearer ${authToken}`);
        });

        test('should return 400 when title is missing', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Task without title'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBeDefined();
        });

        test('should create task without description (description is optional)', async () => {
            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Task without description'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.task.description).toBe('');
            
            // Cleanup
            await request(app)
                .delete(`/api/tasks/${response.body.task.id}`)
                .set('Authorization', `Bearer ${authToken}`);
        });

        test('should return 400 when deadline is before startDate', async () => {
            const startDate = new Date().toISOString();
            const deadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Invalid Date Task',
                    description: 'Deadline before startDate',
                    startDate: startDate,
                    deadline: deadline
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Deadline');
        });
    });

    // =================================================================
    // GET TASKS TESTS (GET /api/tasks)
    // =================================================================

    describe('GET /api/tasks - Get All Tasks', () => {
        test('should return all tasks for authenticated user', async () => {
            const response = await request(app)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.tasks)).toBe(true);
            expect(response.body.tasks.length).toBeGreaterThan(0);

            // Verify task structure
            const task = response.body.tasks[0];
            expect(task).toHaveProperty('id');
            expect(task).toHaveProperty('title');
            expect(task).toHaveProperty('description');
            expect(task).toHaveProperty('status');
            expect(task).toHaveProperty('startDate');
            expect(task).toHaveProperty('deadline');
            expect(task).toHaveProperty('progress');
            expect(task).toHaveProperty('isOverdue');
            expect(task).toHaveProperty('createdAt');
            expect(task).toHaveProperty('updatedAt');
        });

        test('should filter tasks by status (PENDING)', async () => {
            const response = await request(app)
                .get('/api/tasks?status=PENDING')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // All returned tasks should have PENDING status
            response.body.tasks.forEach(task => {
                expect(task.status).toBe('PENDING');
            });
        });

        test('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .get('/api/tasks');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // GET TASK BY ID TESTS (GET /api/tasks/:id)
    // =================================================================

    describe('GET /api/tasks/:id - Get Task by ID', () => {
        test('should return task details for valid ID', async () => {
            const response = await request(app)
                .get(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.task.id).toBe(createdTaskId);
            expect(response.body.task.title).toBe('Integration Test Task');
        });

        test('should return 404 for non-existent task ID', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            
            const response = await request(app)
                .get(`/api/tasks/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .get(`/api/tasks/${createdTaskId}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // UPDATE TASK TESTS (PUT /api/tasks/:id)
    // =================================================================

    describe('PUT /api/tasks/:id - Update Task', () => {
        test('should update task title and description', async () => {
            const response = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Updated Task Title',
                    description: 'Updated task description'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.task.title).toBe('Updated Task Title');
            expect(response.body.task.description).toBe('Updated task description');
        });

        test('should update task deadline', async () => {
            const newDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days from now

            const response = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    deadline: newDeadline
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.task).toHaveProperty('deadline');
            expect(response.body.task.deadline).not.toBeNull();
            // Deadline should be updated (not necessarily future due to test reruns)
        });

        test('should update task startDate', async () => {
            const newStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

            const response = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    startDate: newStartDate
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should return 400 when updating deadline before startDate', async () => {
            const invalidDeadline = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 2 days ago

            const response = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    deadline: invalidDeadline
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should return 404 for non-existent task', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app)
                .put(`/api/tasks/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Updated Title'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // CHANGE STATUS TESTS (PATCH /api/tasks/:id/status)
    // =================================================================

    describe('PATCH /api/tasks/:id/status - Change Task Status', () => {
        test('should change task status to IN_PROGRESS', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${createdTaskId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'IN_PROGRESS'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.task.status).toBe('IN_PROGRESS');
        });

        test('should change task status to COMPLETED', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${createdTaskId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'COMPLETED'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.task.status).toBe('COMPLETED');
            expect(response.body.task.isOverdue).toBe(false); // Completed tasks not overdue
        });

        test('should not allow changing COMPLETED back to PENDING (business rule)', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${createdTaskId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'PENDING'
                });

            // Business rule: Cannot go from COMPLETED to PENDING directly
            expect(response.status).toBe(422);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('completed');
        });

        test('should return 400 for invalid status', async () => {
            const response = await request(app)
                .patch(`/api/tasks/${createdTaskId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'INVALID_STATUS'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should return 404 for non-existent task', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app)
                .patch(`/api/tasks/${fakeId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'COMPLETED'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // GET STATISTICS TESTS (GET /api/tasks/statistics)
    // =================================================================

    describe('GET /api/tasks/statistics - Get Task Statistics', () => {
        test('should return statistics for user tasks', async () => {
            const response = await request(app)
                .get('/api/tasks/statistics')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.statistics).toHaveProperty('totalTasks');
            expect(response.body.statistics).toHaveProperty('completedTasks');
            expect(response.body.statistics).toHaveProperty('pendingTasks');
            expect(response.body.statistics).toHaveProperty('inProgressTasks');
            expect(response.body.statistics).toHaveProperty('completionRate');

            // Verify numbers are valid
            expect(typeof response.body.statistics.totalTasks).toBe('number');
            expect(typeof response.body.statistics.completionRate).toBe('number');
            expect(response.body.statistics.completionRate).toBeGreaterThanOrEqual(0);
            expect(response.body.statistics.completionRate).toBeLessThanOrEqual(100);
        });

        test('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .get('/api/tasks/statistics');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // DELETE TASK TESTS (DELETE /api/tasks/:id)
    // =================================================================

    describe('DELETE /api/tasks/:id - Delete Task', () => {
        test('should delete task successfully', async () => {
            // First create a task to delete
            const createResponse = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Task to Delete',
                    description: 'This task will be deleted'
                });

            const taskToDeleteId = createResponse.body.task.id;

            // Now delete it
            const deleteResponse = await request(app)
                .delete(`/api/tasks/${taskToDeleteId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.success).toBe(true);

            // Verify it's deleted by trying to get it
            const getResponse = await request(app)
                .get(`/api/tasks/${taskToDeleteId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(404);
        });

        test('should return 404 when deleting non-existent task', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app)
                .delete(`/api/tasks/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .delete(`/api/tasks/${createdTaskId}`);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // =================================================================
    // PROGRESS & OVERDUE TESTS (Business Logic Validation)
    // =================================================================

    describe('Progress & Overdue - Business Logic', () => {
        let taskWithDeadline;

        beforeAll(async () => {
            // Create task with specific deadline for testing
            const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
            const deadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days from now

            const response = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Progress Test Task',
                    description: 'Task for testing progress calculation',
                    startDate: startDate,
                    deadline: deadline
                });

            taskWithDeadline = response.body.task;
        });

        afterAll(async () => {
            // Cleanup
            if (taskWithDeadline) {
                await request(app)
                    .delete(`/api/tasks/${taskWithDeadline.id}`)
                    .set('Authorization', `Bearer ${authToken}`);
            }
        });

        test('should calculate progress based on time elapsed', async () => {
            const response = await request(app)
                .get(`/api/tasks/${taskWithDeadline.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.task.progress).toBeGreaterThanOrEqual(0);
            expect(response.body.task.progress).toBeLessThanOrEqual(100);
            expect(typeof response.body.task.progress).toBe('number');
        });

        test('should detect isOverdue correctly', async () => {
            const response = await request(app)
                .get(`/api/tasks/${taskWithDeadline.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(typeof response.body.task.isOverdue).toBe('boolean');
            // Overdue status depends on current time vs deadline
        });

        test('should detect overdue task correctly', async () => {
            // Create task with past deadline
            const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday

            const createResponse = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Overdue Task',
                    description: 'Task with past deadline',
                    startDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                    deadline: pastDeadline
                });

            const overdueTaskId = createResponse.body.task.id;

            const getResponse = await request(app)
                .get(`/api/tasks/${overdueTaskId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.task.isOverdue).toBe(true);
            expect(getResponse.body.task.progress).toBe(100); // Overdue tasks show 100%

            // Cleanup
            await request(app)
                .delete(`/api/tasks/${overdueTaskId}`)
                .set('Authorization', `Bearer ${authToken}`);
        });

        test('completed task should not be overdue even if past deadline', async () => {
            // Create overdue task
            const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const createResponse = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Completed Overdue Task',
                    description: 'Completed task with past deadline',
                    startDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
                    deadline: pastDeadline
                });

            const taskId = createResponse.body.task.id;

            // Mark as completed
            await request(app)
                .patch(`/api/tasks/${taskId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'COMPLETED' });

            // Get task and verify not overdue
            const getResponse = await request(app)
                .get(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(getResponse.status).toBe(200);
            expect(getResponse.body.task.status).toBe('COMPLETED');
            expect(getResponse.body.task.isOverdue).toBe(false);

            // Cleanup
            await request(app)
                .delete(`/api/tasks/${taskId}`)
                .set('Authorization', `Bearer ${authToken}`);
        });
    });
});
