const { SqlServerDatabase } = require('./infrastructure/database/SqlServerDatabase');
const { BcryptPasswordService } = require('./infrastructure/security/BcryptPasswordService');
const { JwtTokenService } = require('./infrastructure/security/JwtTokenService');
const { SqlUserRepository } = require('./adapters/repositories/SqlUserRepository');
const { SqlTaskRepository } = require('./adapters/repositories/SqlTaskRepository');
const { Config } = require('./infrastructure/config/Config');

// Use Cases
const { 
    RegisterUserUseCase,
    LoginUserUseCase,
    VerifyTokenUseCase,
    CreateTaskUseCase,
    GetTasksUseCase,
    GetTaskByIdUseCase,
    UpdateTaskUseCase,
    DeleteTaskUseCase,
    ChangeTaskStatusUseCase,
    GetTaskStatisticsUseCase
} = require('./business');

// Controllers
const { AuthController } = require('./adapters/controllers/AuthController');
const { TaskController } = require('./adapters/controllers/TaskController');
const { AuthMiddleware } = require('./adapters/middleware/AuthMiddleware');

/**
 * Dependency Injection Container
 * Infrastructure layer - wires all dependencies together
 */
class DIContainer {
    constructor() {
        this.instances = {};
    }

    /**
     * Initialize all dependencies
     */
    async initialize() {
        // Infrastructure - Database
        this.database = new SqlServerDatabase();
        await this.database.connect(Config.DB_CONFIG);

        // Infrastructure - Services
        this.passwordService = new BcryptPasswordService(Config.BCRYPT_SALT_ROUNDS);
        this.tokenService = new JwtTokenService(Config.JWT_SECRET, Config.JWT_EXPIRES_IN);

        // Adapters - Repositories
        this.userRepository = new SqlUserRepository(this.database);
        this.taskRepository = new SqlTaskRepository(this.database);

        // Business - Auth Use Cases
        this.registerUserUseCase = new RegisterUserUseCase(
            this.userRepository,
            this.passwordService
        );

        this.loginUserUseCase = new LoginUserUseCase(
            this.userRepository,
            this.passwordService,
            this.tokenService
        );

        this.verifyTokenUseCase = new VerifyTokenUseCase(
            this.tokenService,
            this.userRepository
        );

        // Business - Task Use Cases
        this.createTaskUseCase = new CreateTaskUseCase(this.taskRepository);
        this.getTasksUseCase = new GetTasksUseCase(this.taskRepository);
        this.getTaskByIdUseCase = new GetTaskByIdUseCase(this.taskRepository);
        this.updateTaskUseCase = new UpdateTaskUseCase(this.taskRepository);
        this.deleteTaskUseCase = new DeleteTaskUseCase(this.taskRepository);
        this.changeTaskStatusUseCase = new ChangeTaskStatusUseCase(this.taskRepository);
        this.getTaskStatisticsUseCase = new GetTaskStatisticsUseCase(this.taskRepository);

        // Adapters - Controllers
        this.authController = new AuthController(
            this.registerUserUseCase,
            this.loginUserUseCase,
            this.verifyTokenUseCase
        );

        this.taskController = new TaskController(
            this.createTaskUseCase,
            this.getTasksUseCase,
            this.getTaskByIdUseCase,
            this.updateTaskUseCase,
            this.deleteTaskUseCase,
            this.changeTaskStatusUseCase,
            this.getTaskStatisticsUseCase
        );

        // Adapters - Middleware
        this.authMiddleware = new AuthMiddleware(this.verifyTokenUseCase);

        console.log('✅ Dependency Injection Container initialized');
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.database) {
            await this.database.disconnect();
        }
    }

    // Getters for controllers and middleware
    getAuthController() {
        return this.authController;
    }

    getTaskController() {
        return this.taskController;
    }

    getAuthMiddleware() {
        return this.authMiddleware;
    }

    getDatabase() {
        return this.database;
    }
}

module.exports = { DIContainer };
