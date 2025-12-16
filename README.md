# 📋 Task Manager - Clean Architecture

> **Dự án học thuật** về Clean Architecture với Node.js, Express.js và SQL Server

A production-ready Task Management System demonstrating **Clean Architecture** principles with comprehensive testing, security best practices, and modern frontend design.

[![Tests](https://img.shields.io/badge/tests-182%20passing-brightgreen)]() [![Coverage](https://img.shields.io/badge/coverage-83%25-yellow)]() [![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)]() [![SQL Server](https://img.shields.io/badge/SQL%20Server-2019%2B-blue)]()

---

## 🎯 Giới thiệu

Dự án này được xây dựng như một ví dụ hoàn chỉnh về **Clean Architecture** trong thực tế, bao gồm:

- ✅ **4 layers rõ ràng**: Domain → Business → Adapters → Infrastructure
- ✅ **Dependency Rule nghiêm ngặt**: Inner layers không phụ thuộc vào outer layers
- ✅ **182 unit + integration tests**: Coverage 83%, tất cả business logic được test
- ✅ **Security best practices**: JWT, bcrypt, SQL injection prevention, XSS protection
- ✅ **RESTful API**: 11 endpoints với validation đầy đủ
- ✅ **Modern Frontend**: Vanilla JS với monochrome design, responsive
- ✅ **Deadline Feature**: Progress tracking, overdue detection

---

## ✨ Features

### 🔐 Authentication & Authorization
- User registration với validation (username, email, password)
- JWT-based authentication (1 hour expiry)
- bcrypt password hashing (10 salt rounds)
- Protected routes với middleware
- Token refresh mechanism

### 📝 Task Management
- **CRUD Operations**: Create, Read, Update, Delete tasks
- **Status Workflow**: PENDING → IN_PROGRESS → COMPLETED
- **Business Rules**: Cannot change COMPLETED → PENDING directly
- **Deadline Tracking**: 
  - Start date và deadline với ISO 8601 format
  - Auto-calculated progress percentage (0-100%)
  - Overdue detection (isOverdue flag)
  - Progress bar với color coding (green/yellow/red)
- **Statistics**: Task count by status, completion rate
- **Filtering**: View tasks by status (All, Pending, In Progress, Completed)
- **Authorization**: Users can only manage their own tasks

### 🎨 Frontend Design
- **Monochrome Theme**: Black, gray, white với gradient accents
- **Square Corners**: No border-radius, modern aesthetic
- **Responsive**: Mobile-first design, works on all devices
- **Progress Bar**: Visual time tracking với color coding
- **Quick Actions**: Quick complete button, inline edit/delete
- **Notifications**: Toast messages for success/error feedback
- **Loading States**: Spinners và skeleton loaders

---

## 🏛️ Clean Architecture

Dự án tuân thủ nghiêm ngặt **Clean Architecture** principles của Uncle Bob:

```
┌─────────────────────────────────────────┐
│         Infrastructure Layer            │
│  • SQL Server Connection Pooling        │
│  • JWT Token Service (jsonwebtoken)     │
│  • bcrypt Password Service               │
│  • Database Config & Wiring              │
└──────────────┬──────────────────────────┘
               │ implements interfaces from
               ↓
┌─────────────────────────────────────────┐
│           Adapters Layer                │
│  • AuthController, TaskController       │
│  • SqlUserRepository, SqlTaskRepository │
│  • AuthMiddleware                        │
│  • Response Presenters                   │
└──────────────┬──────────────────────────┘
               │ depends on
               ↓
┌─────────────────────────────────────────┐
│          Business Layer                 │
│  • 11 Use Cases (7 Task + 4 Auth)       │
│  • Input/Output DTOs                     │
│  • Repository Interfaces (Ports)        │
│  • Business Rules Validation             │
└──────────────┬──────────────────────────┘
               │ depends on
               ↓
┌─────────────────────────────────────────┐
│           Domain Layer                  │
│  • Task Entity (rich domain model)      │
│  • User Entity                           │
│  • TaskStatus Value Object               │
│  • DomainException                       │
│  • Pure business logic (NO framework)   │
└─────────────────────────────────────────┘
```

**Key Principles:**
- **Dependency Rule**: Dependencies flow **inward only** (Infrastructure → Adapters → Business → Domain)
- **Framework Independence**: Domain và Business layers không import gì từ Express, mssql, hoặc bất kỳ framework nào
- **Testability**: Business logic có thể test độc lập (mock repositories)
- **Repository Pattern**: Database abstraction qua interfaces
- **Dependency Injection**: Manual DI container (DIContainer.js)

📖 **Chi tiết kiến trúc:** [materials/mega-prompt.md](materials/mega-prompt.md)

---

## 📁 Project Structure

```
JS-TaskManager/
├── domain/                     # 🏛️ Domain Layer (Pure business logic)
│   ├── entities/              # Task.js, User.js
│   ├── valueobjects/          # TaskStatus.js (immutable)
│   └── exceptions/            # DomainException.js
│
├── business/                   # 💼 Business Layer (Use Cases)
│   ├── usecases/
│   │   ├── auth/             # RegisterUserUseCase, LoginUserUseCase, VerifyTokenUseCase
│   │   └── tasks/            # 7 task use cases (Create, Get, Update, Delete, ChangeStatus, Statistics)
│   ├── dto/                  # Input/Output DTOs (data transfer objects)
│   └── ports/                # Repository interfaces (contracts)
│
├── adapters/                   # 🔌 Adapters Layer (HTTP & Data)
│   ├── controllers/          # AuthController, TaskController
│   ├── middleware/           # AuthMiddleware.js (JWT verification)
│   └── repositories/         # SqlUserRepository, SqlTaskRepository
│
├── infrastructure/             # ⚙️ Infrastructure Layer (Frameworks)
│   ├── database/
│   │   ├── SqlDatabase.js    # Connection pooling
│   │   └── models/           # TaskModel, UserModel (SQL queries)
│   ├── security/             # BcryptPasswordService, JwtTokenService
│   └── config/               # Config.js (environment variables)
│
├── public/                     # 🎨 Frontend (Vanilla JS)
│   ├── index.html            # Landing page
│   ├── login.html, register.html, dashboard.html
│   ├── css/                  # Monochrome design
│   └── js/                   # API client, Dashboard logic (with JSDoc)
│
├── tests/                      # 🧪 Comprehensive Tests
│   ├── domain/               # Task, User, TaskStatus tests
│   ├── business/             # Use case tests (all 11 use cases)
│   ├── adapters/             # Repository integration tests
│   └── integration/          # E2E API tests (32 tests, 100% passing)
│
├── router/                     # 🛣️ Express route definitions
├── scripts/                    # Database migration scripts
├── materials/                  # 📚 Documentation
│   ├── api-list.txt          # Full API documentation
│   ├── mega-prompt.md        # Clean Architecture guide
│   ├── knowledge.txt         # Node.js best practices
│   └── TODO-LIST.txt         # Project completion checklist
│
├── app.js                      # Express app setup
├── server.js                   # HTTP server entry point
├── DIContainer.js              # Dependency injection
├── .env.example                # Environment template
├── jest.config.js              # Test configuration
└── package.json                # Dependencies
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **SQL Server 2019+** (Express/Developer/Standard)
  - Windows: [Download from Microsoft](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
  - Linux/Mac: Use Docker (see below)
- **Git** (optional)

### Installation

#### Step 1: Clone & Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd JS-TaskManager

# Install dependencies
npm install
```

#### Step 2: Setup SQL Server

**Option A: Using Docker (Linux/Mac/Windows)**
```bash
# Start SQL Server container
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Password123" \
  -p 1433:1433 --name sqlserver \
  -d mcr.microsoft.com/mssql/server:2022-latest

# Verify container is running
docker ps

# Access SQL Server Management Studio or Azure Data Studio
# Server: localhost,1433
# Authentication: SQL Login
# Username: sa
# Password: YourStrong@Password123
```

**Option B: Windows (Native SQL Server)**
- Download SQL Server 2019+ Developer Edition
- Install với default settings
- Remember SA password during setup

#### Step 3: Create Database & Tables

```bash
# Start SQL Server (if using Docker)
docker start sqlserver

# Create database via SQL client or script
node scripts/create-database.js

# Or manually via SSMS/Azure Data Studio:
# CREATE DATABASE TaskManager;
# Then run scripts/create-tables.sql
```

#### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Windows: notepad .env
# Linux/Mac: nano .env
```

**.env configuration:**
```env
# Server
PORT=3000
NODE_ENV=development

# Database (SQL Server)
DB_USER=sa
DB_PASSWORD=YourStrong@Password123
DB_SERVER=localhost
DB_DATABASE=TaskManager
DB_PORT=1433

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10

# CORS (optional)
CORS_ORIGIN=http://localhost:3000
```

#### Step 5: Run Application

```bash
# Development mode (with nodemon auto-reload)
npm run dev

# Production mode
npm start

# Run tests
npm test

# Check test coverage
npm run test:coverage
```

#### Step 6: Access Application

- **Frontend**: http://localhost:3000
- **API Base**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

---

## 🧪 Testing Strategy

Dự án có **182 passing tests** với coverage 83%:

### Test Structure

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage      # Generate coverage report
npm run test:watch         # Watch mode
```

### Test Coverage

| Layer | Files | Statements | Branches | Functions | Lines |
|-------|-------|-----------|----------|-----------|-------|
| Domain | 4 | 93.14% | 88.34% | 100% | 94.73% |
| Business | 19 | 91.83% | 100% | 84% | 91.75% |
| Adapters | 5 | 80.28% | 50% | 87.5% | 79.71% |
| Infrastructure | 8 | 64.7% | 40% | 71.42% | 64.7% |
| **Total** | **36** | **83.15%** | **77.33%** | **76.95%** | **83.35%** |

### Test Examples

**Domain Layer (Pure Business Logic):**
```javascript
// tests/domain/Task.test.js
describe('Task Entity', () => {
  it('should calculate progress correctly', () => {
    const task = new Task('Test', '', 'user123', 
      new Date('2025-01-01'), new Date('2025-01-31'));
    expect(task.getProgressPercentage()).toBeGreaterThanOrEqual(0);
    expect(task.getProgressPercentage()).toBeLessThanOrEqual(100);
  });
  
  it('should detect overdue tasks', () => {
    const task = Task.reconstruct('id', 'Test', '', 'PENDING', 'user123',
      new Date('2024-01-01'), new Date('2024-12-31'), new Date(), new Date());
    expect(task.isOverdue()).toBe(true);
  });
});
```

**Business Layer (Use Cases):**
```javascript
// tests/business/usecases/CreateTaskUseCase.test.js
describe('CreateTaskUseCase', () => {
  it('should create task with deadline', async () => {
    const input = new CreateTaskInputDTO(
      'Test Task', 'Description', 'user123',
      new Date(), new Date('2025-12-31')
    );
    const result = await useCase.execute(input);
    expect(result.taskId).toBeDefined();
    expect(result.deadline).toBeTruthy();
  });
});
```

**Integration Layer (E2E API):**
```javascript
// tests/integration/TaskController.test.js
describe('POST /api/tasks', () => {
  it('should create task with deadline', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test',
        deadline: '2025-12-31T18:00:00Z'
      });
    expect(response.status).toBe(201);
    expect(response.body.task.progress).toBe(0);
  });
});
```

## 🧪 Testing

```powershell
# Run all tests with coverage
npm test
---

## 📡 API Documentation

### Authentication Endpoints (Public)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new account | `{username, email, password}` |
| POST | `/api/auth/login` | Login & get JWT token | `{email, password}` |
| GET | `/api/auth/me` | Get current user info | - |
| POST | `/api/auth/logout` | Logout (client-side) | - |

### Task Endpoints (Protected)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/tasks` | Create task | `{title, description?, startDate?, deadline?}` |
| GET | `/api/tasks` | List user's tasks | Query: `?status=PENDING` |
| GET | `/api/tasks/:id` | Get task by ID | - |
| PUT | `/api/tasks/:id` | Update task | `{title?, description?, startDate?, deadline?}` |
| DELETE | `/api/tasks/:id` | Delete task | - |
| PATCH | `/api/tasks/:id/status` | Change task status | `{status}` |
| GET | `/api/tasks/statistics` | Get task statistics | - |

### API Examples

**Register New User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Create Task with Deadline:**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project report",
    "description": "Write final report and submit",
    "startDate": "2025-01-01T09:00:00Z",
    "deadline": "2025-01-31T18:00:00Z"
  }'

# Response includes:
# - progress: Auto-calculated progress percentage (0-100%)
# - isOverdue: Boolean flag for overdue tasks
```

**Get Tasks with Filter:**
```bash
curl -X GET "http://localhost:3000/api/tasks?status=IN_PROGRESS" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

📖 **Complete API documentation:** [materials/api-list.txt](materials/api-list.txt)

---

## 🎨 Frontend Features

### Pages

1. **Landing Page** (`/`)
   - Hero section với call-to-action
   - Features showcase
   - Clean Architecture benefits
   - Modern monochrome design

2. **Register** (`/register.html`)
   - Username, email, password fields
   - Real-time validation
   - Password strength indicator
   - Error handling

3. **Login** (`/login.html`)
   - Email/password authentication
   - Remember me option
   - Error messages
   - Redirect to dashboard on success

4. **Dashboard** (`/dashboard.html`)
   - **Statistics Cards**: Total, Pending, In Progress, Completed
   - **Task List**: Scrollable with progress bars
   - **Filter Buttons**: All, Pending, In Progress, Completed
   - **Create Task Modal**: Form with date pickers
   - **Progress Bars**: Color-coded (green/yellow/red)
   - **Quick Actions**: Edit, Delete, Quick Complete
   - **Notifications**: Toast messages for feedback

### UI/UX Design Principles

- **Monochrome Theme**: Black (#000), Dark Gray (#333), Light Gray (#555), White (#fff)
- **Square Corners**: border-radius: 0 (modern, clean aesthetic)
- **Gradient Accents**: Linear gradients for headers and buttons
- **Responsive**: Mobile-first, works on all screen sizes
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Performance**: Vanilla JS (no frameworks), minimal bundle size

### Progress Bar Logic

```javascript
// Color coding based on time elapsed
if (progress >= 80) {
  color = 'red';    // Danger: Almost due
} else if (progress >= 50) {
  color = 'yellow'; // Warning: Halfway
} else {
  color = 'green';  // Safe: Plenty of time
}
```

---

## 🔒 Security Best Practices

### Implemented Security Measures

| Layer | Security Feature | Implementation |
|-------|-----------------|----------------|
| **Authentication** | JWT Tokens | 1 hour expiry, httpOnly cookies (optional) |
| **Password** | bcrypt Hashing | 10 salt rounds, auto-salting |
| **SQL Injection** | Prepared Statements | All queries use parameterized inputs |
| **XSS** | Input Escaping | HTML escaping on frontend |
| **CORS** | Origin Whitelist | Configured in app.js |
| **Headers** | Helmet Middleware | Security HTTP headers |
| **Authorization** | Middleware | Task ownership verification |
| **Rate Limiting** | (TODO) | Recommended for production |

### Security Code Examples

**Password Hashing (bcrypt):**
```javascript
// infrastructure/security/BcryptPasswordService.js
async hash(password) {
  const salt = await bcrypt.genSalt(10);  // 10 rounds
  return bcrypt.hash(password, salt);
}
```

**SQL Injection Prevention:**
```javascript
// infrastructure/database/models/TaskModel.js
async findById(taskId) {
  const request = this.pool.request();
  request.input('taskId', sql.NVarChar, taskId);  // Parameterized
  return request.query('SELECT * FROM Tasks WHERE id = @taskId');
}
```

**JWT Verification:**
```javascript
// adapters/middleware/AuthMiddleware.js
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;  // Attach to request
```

---

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: Microsoft SQL Server 2019+
- **ORM/Driver**: mssql (native driver with connection pooling)
- **Authentication**: jsonwebtoken (JWT)
- **Password**: bcrypt (10 salt rounds)
- **Security**: Helmet, CORS
- **Testing**: Jest + supertest
- **Environment**: dotenv

### Frontend

- **HTML5**: Semantic markup
- **CSS3**: Custom properties, Flexbox, Grid
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **API Client**: Fetch API
- **Design**: Monochrome theme, responsive

### DevOps

- **Process Manager**: PM2 (optional)
- **Containerization**: Docker + Docker Compose
- **Version Control**: Git
- **CI/CD**: GitHub Actions (optional)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [materials/api-list.txt](materials/api-list.txt) | Complete API documentation with examples |
| [materials/mega-prompt.md](materials/mega-prompt.md) | Clean Architecture guide (comprehensive) |
| [materials/knowledge.txt](materials/knowledge.txt) | Node.js & Express best practices |
| [materials/TODO-LIST.txt](materials/TODO-LIST.txt) | Project completion checklist |
| [DEADLINE_FEATURE_SUMMARY.md](DEADLINE_FEATURE_SUMMARY.md) | Deadline feature implementation details |

---

## 🎓 Learning Resources

Dự án này là tài liệu học tập hoàn chỉnh về:

1. **Clean Architecture**: Domain-driven design, dependency inversion
2. **RESTful API**: HTTP methods, status codes, resource naming
3. **Authentication**: JWT, bcrypt, session management
4. **Database**: SQL Server, connection pooling, prepared statements
5. **Testing**: Unit tests, integration tests, TDD
6. **Security**: SQL injection, XSS, CORS, authentication
7. **Frontend**: Vanilla JS, responsive design, API integration

### Recommended Reading

- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [RESTful API Design](https://restfulapi.net/)
- [JWT Introduction](https://jwt.io/introduction)
- [OWASP Security Practices](https://owasp.org/)
- **Schema:** Collections → Tables with constraints
- **Queries:** Raw SQL → Parameterized SQL (SQL injection prevention)

📖 **Full migration guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

---

## 🔒 Security Notes

- **Passwords:** bcrypt hashing with configurable salt rounds
- **Authentication:** JWT with expiration
- **SQL Injection:** All queries use parameterized statements
- **XSS:** User input escaped in frontend
- **CORS:** Configurable origins
- **Headers:** Helmet middleware for security headers
## 🐳 Docker Deployment

### SQL Server + Application

```powershell
# 1. Start SQL Server in Docker
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Password" \
  -p 1433:1433 --name sqlserver \
  -d mcr.microsoft.com/mssql/server:2022-latest

# 2. Build application
docker build -t js-task-manager .

# 3. Run application (connect to SQL Server)
docker run -d -p 3000:3000 \
  -e DB_SERVER=host.docker.internal \
  -e DB_USER=sa \
  -e DB_PASSWORD=YourStrong@Password \
  -e DB_DATABASE=TaskManager \
  js-task-manager
```

## ☁️ Azure Deployment

### With Azure SQL Database

```powershell
# 1. Create Azure SQL Database
az sql server create --name yourserver --resource-group yourgroup
az sql db create --name TaskManager --server yourserver

# 2. Deploy to Azure App Service
az webapp create --name your-app --resource-group yourgroup
az webapp deployment source config --name your-app --repo-url YOUR_REPO

# 3. Configure connection string
az webapp config appsettings set --name your-app --settings \
  DB_SERVER=yourserver.database.windows.net \
  DB_USER=youradmin \
  DB_PASSWORD=YourPassword \
  DB_DATABASE=TaskManager \
  JWT_SECRET=your-secret

# Deploy
git push heroku main
```

---

## 🚀 Deployment

### Docker Deployment

**1. Build Docker image:**
```bash
docker build -t task-manager .
```

**2. Run with Docker Compose:**
```bash
docker-compose up -d
```

**docker-compose.yml** (recommended):
```yaml
version: '3.8'
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Password123
    ports:
      - "1433:1433"
    volumes:
      - sqldata:/var/opt/mssql
  
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_SERVER=sqlserver
      - DB_USER=sa
      - DB_PASSWORD=YourStrong@Password123
    depends_on:
      - sqlserver

volumes:
  sqldata:
```

### Production Checklist

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Use strong `DB_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up rate limiting
- [ ] Configure logging (winston/bunyan)
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Database backups (automated)
- [ ] Environment secrets management
- [ ] CORS whitelist production domains

---

## 🎯 Business Rules

### Task Status Workflow

```
PENDING ──────────> IN_PROGRESS ──────────> COMPLETED
   ↑                                            │
   │                                            │
   └────────────────────────────────────────────┘
        (Cannot go directly from COMPLETED to PENDING)
```

**Enforced Rules:**
- ✅ Cannot change COMPLETED → PENDING directly (must set to IN_PROGRESS first)
- ✅ Deadline must be after start date
- ✅ Task title required (max 200 chars)
- ✅ Description optional (max 1000 chars)
- ✅ Users can only access their own tasks
- ✅ Progress auto-calculated based on time elapsed
- ✅ Completed tasks always have progress = 100%
- ✅ Overdue flag = false for completed tasks

### Validation Rules

| Field | Validation |
|-------|-----------|
| Username | 3-50 chars, alphanumeric + underscore, unique |
| Email | Valid email format, unique |
| Password | Min 6 chars, bcrypt hashed |
| Task Title | Required, 1-200 chars |
| Task Description | Optional, max 1000 chars |
| Start Date | Optional, ISO 8601 format, default = now |
| Deadline | Optional, must be after startDate |

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork repository** và clone về local
2. **Create feature branch**: `git checkout -b feature/AmazingFeature`
3. **Follow Clean Architecture rules**:
   - Domain layer: NO framework imports
   - Business layer: NO infrastructure imports
   - Use dependency injection
4. **Write tests**: Maintain 80%+ coverage
   ```bash
   npm test -- --coverage
   ```
5. **Follow code style**: ESLint + Prettier
6. **Commit with clear messages**:
   ```bash
   git commit -m "feat: Add deadline feature to tasks"
   git commit -m "fix: SQL injection vulnerability in user repository"
   git commit -m "docs: Update API documentation"
   ```
7. **Push branch**: `git push origin feature/AmazingFeature`
8. **Open Pull Request** với detailed description

### Code Standards

- ✅ Clean Architecture layers separation
- ✅ JSDoc comments for all public functions
- ✅ Unit tests for business logic
- ✅ Integration tests for APIs
- ✅ Error handling with try-catch
- ✅ Input validation before processing
- ✅ No hardcoded credentials

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

### Architectural Patterns
- **Clean Architecture** by Robert C. Martin (Uncle Bob)
- **Domain-Driven Design** by Eric Evans
- **SOLID Principles** for object-oriented design
- **Repository Pattern** for data access abstraction
- **Dependency Injection** for loose coupling

### Technologies & Libraries
- **Express.js** - Fast, unopinionated web framework
- **mssql** - Microsoft SQL Server client for Node.js
- **jsonwebtoken** - JWT implementation
- **bcrypt** - Password hashing library
- **Jest** - Testing framework
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### Educational Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Microsoft SQL Server Documentation](https://docs.microsoft.com/en-us/sql/)

---

## 📬 Contact & Support

- **Project Repository**: [GitHub](https://github.com/yourusername/JS-TaskManager)
- **Issues**: [GitHub Issues](https://github.com/yourusername/JS-TaskManager/issues)
- **Documentation**: [materials/](materials/)

---

**Built with ❤️ for learning Clean Architecture**

*This project demonstrates production-ready software engineering practices suitable for academic and professional portfolios.*
