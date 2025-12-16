const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { DIContainer } = require('./DIContainer');
const { Config } = require('./infrastructure/config/Config');

/**
 * Express Application Setup
 * Infrastructure layer - HTTP server configuration
 */
class App {
    constructor() {
        this.app = express();
        this.container = null;
    }

    /**
     * Initialize application
     */
    async initialize() {
        // Initialize DI Container
        this.container = new DIContainer();
        await this.container.initialize();

        // Setup middleware
        this.setupMiddleware();

        // Setup routes
        this.setupRoutes();

        // Setup error handlers
        this.setupErrorHandlers();

        console.log('✅ Express application initialized');
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Static files
        this.app.use(express.static('public'));

        // Security
        this.app.use(helmet({
            contentSecurityPolicy: false // Allow inline scripts for simplicity
        }));
        this.app.use(cors({
            origin: Config.CORS_ORIGIN,
            credentials: true
        }));

        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Request logging (development only)
        if (Config.isDevelopment()) {
            this.app.use((req, res, next) => {
                console.log(`${req.method} ${req.path}`);
                next();
            });
        }
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        const authController = this.container.getAuthController();
        const taskController = this.container.getTaskController();
        const taskDisplayController = this.container.getTaskDisplayController();
        const authMiddleware = this.container.getAuthMiddleware();

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                success: true, 
                message: 'Task Manager API is running',
                timestamp: new Date().toISOString()
            });
        });

        // API base route
        this.app.get('/api', (req, res) => {
            res.json({
                success: true,
                message: 'Task Manager API',
                version: '1.0.0',
                endpoints: {
                    auth: '/api/auth',
                    tasks: '/api/tasks',
                    tasksDisplay: '/api/tasks/display'
                }
            });
        });

        // Auth routes (public)
        this.app.post('/api/auth/register', (req, res) => authController.register(req, res));
        this.app.post('/api/auth/login', (req, res) => authController.login(req, res));
        this.app.post('/api/auth/logout', (req, res) => authController.logout(req, res));
        this.app.get('/api/auth/me', (req, res) => authController.getCurrentUser(req, res));

        // Task routes (protected)
        const authenticate = authMiddleware.authenticate();
        
        // ==== DISPLAY ROUTES (NEW - frontend logic moved to backend) ====
        // These endpoints return fully-enriched data for frontend rendering
        // Frontend receives: formatted dates, localized text, progress colors, insights, etc.
        
        this.app.get('/api/tasks/statistics/display', authenticate, (req, res, next) => 
            taskDisplayController.getStatisticsForDisplay(req, res, next));
        
        this.app.get('/api/tasks/display', authenticate, (req, res, next) => 
            taskDisplayController.getTaskListForDisplay(req, res, next));
        
        this.app.get('/api/tasks/:id/display', authenticate, (req, res, next) => 
            taskDisplayController.getTaskForDisplay(req, res, next));
        
        // ==== ORIGINAL ROUTES (kept for backward compatibility) ====
        
        this.app.get('/api/tasks/statistics', authenticate, (req, res) => 
            taskController.getStatistics(req, res));
        
        this.app.post('/api/tasks', authenticate, (req, res) => 
            taskController.createTask(req, res));
        
        this.app.get('/api/tasks', authenticate, (req, res) => 
            taskController.getTasks(req, res));
        
        this.app.get('/api/tasks/:id', authenticate, (req, res) => 
            taskController.getTaskById(req, res));
        
        this.app.put('/api/tasks/:id', authenticate, (req, res) => 
            taskController.updateTask(req, res));
        
        this.app.delete('/api/tasks/:id', authenticate, (req, res) => 
            taskController.deleteTask(req, res));
        
        this.app.patch('/api/tasks/:id/status', authenticate, (req, res) => 
            taskController.changeStatus(req, res));

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });
    }

    /**
     * Setup error handlers
     */
    setupErrorHandlers() {
        const { ErrorHandlerMiddleware } = require('./adapters/middleware/ErrorHandlerMiddleware');

        // 404 handler (must be after all routes)
        this.app.use(ErrorHandlerMiddleware.notFound);

        // Global error handler (must be last middleware)
        this.app.use(ErrorHandlerMiddleware.handle);
    }

    /**
     * Start the server
     */
    start(port = Config.PORT) {
        return new Promise((resolve) => {
            this.server = this.app.listen(port, () => {
                console.log(`\n🚀 Server is running on port ${port}`);
                console.log(`📍 Environment: ${Config.NODE_ENV}`);
                console.log(`🔗 Health check: http://localhost:${port}/health`);
                console.log(`🔗 API endpoint: http://localhost:${port}/api\n`);
                resolve(this.server);
            });
        });
    }

    /**
     * Stop the server
     */
    async stop() {
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(resolve);
            });
        }
        if (this.container) {
            await this.container.cleanup();
        }
        console.log('Server stopped');
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Get DI container
     */
    getContainer() {
        return this.container;
    }
}

module.exports = { App };
